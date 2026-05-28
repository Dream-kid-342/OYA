-- ================================================================
-- Supabase RPC: apply_mpesa_payment
-- ================================================================
-- Atomically applies an M-PESA payment to:
--   1. Creates a repayment record
--   2. Applies payment to earliest unpaid installments
--   3. Updates loan balance and status
--   4. Marks the payment request as SUCCESS
-- All within a single database transaction.
-- ================================================================

CREATE OR REPLACE FUNCTION apply_mpesa_payment(
  p_loan_id              UUID,
  p_user_id              UUID,
  p_payment_request_id   UUID,
  p_amount               NUMERIC,
  p_mpesa_receipt_number TEXT,
  p_phone_number         TEXT,
  p_checkout_request_id  TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with owner privileges (bypasses RLS for atomic ops)
AS $$
DECLARE
  v_current_balance  NUMERIC;
  v_new_balance      NUMERIC;
  v_remaining        NUMERIC;
  v_inst             RECORD;
  v_outstanding      NUMERIC;
  v_to_apply         NUMERIC;
  v_new_paid         NUMERIC;
  v_new_status       TEXT;
  v_loan_status      TEXT;
BEGIN
  -- ── Lock the loan row to prevent concurrent payment races ──────────────
  SELECT balance_remaining INTO v_current_balance
  FROM loans
  WHERE id = p_loan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan % not found', p_loan_id;
  END IF;

  -- ── 1. Create repayment record ─────────────────────────────────────────
  INSERT INTO repayments (
    loan_id, user_id, amount, mpesa_receipt_number,
    phone_number, payment_method, checkout_request_id,
    transaction_date, reconciled, created_at, updated_at
  ) VALUES (
    p_loan_id, p_user_id, p_amount, p_mpesa_receipt_number,
    p_phone_number, 'MPESA', p_checkout_request_id,
    NOW(), TRUE, NOW(), NOW()
  );

  -- ── 2. Apply payment to installments (earliest unpaid first) ──────────
  v_remaining := p_amount;

  FOR v_inst IN
    SELECT id, amount_due, amount_paid
    FROM installments
    WHERE loan_id = p_loan_id
      AND status IN ('UNPAID', 'PARTIAL')
    ORDER BY installment_number ASC
    FOR UPDATE  -- Lock rows for concurrent safety
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_outstanding := v_inst.amount_due - v_inst.amount_paid;
    v_to_apply    := LEAST(v_remaining, v_outstanding);
    v_new_paid    := v_inst.amount_paid + v_to_apply;

    IF v_new_paid >= v_inst.amount_due THEN
      v_new_status := 'PAID';
    ELSE
      v_new_status := 'PARTIAL';
    END IF;

    UPDATE installments
    SET
      amount_paid = v_new_paid,
      status      = v_new_status,
      paid_at     = CASE WHEN v_new_status = 'PAID' THEN NOW() ELSE NULL END,
      updated_at  = NOW()
    WHERE id = v_inst.id;

    v_remaining := v_remaining - v_to_apply;
  END LOOP;

  -- ── 3. Update loan balance ─────────────────────────────────────────────
  v_new_balance := GREATEST(0, v_current_balance - p_amount);

  IF v_new_balance = 0 THEN
    v_loan_status := 'CLOSED';
  ELSE
    v_loan_status := 'ACTIVE';
  END IF;

  UPDATE loans
  SET
    total_repaid      = total_repaid + p_amount,
    balance_remaining = v_new_balance,
    status            = v_loan_status,
    actual_close_date = CASE WHEN v_loan_status = 'CLOSED' THEN NOW() ELSE actual_close_date END,
    updated_at        = NOW()
  WHERE id = p_loan_id;

  -- ── 4. Mark payment request as SUCCESS ────────────────────────────────
  UPDATE payment_requests
  SET
    status               = 'SUCCESS',
    callback_received_at = NOW(),
    updated_at           = NOW()
  WHERE id = p_payment_request_id;

END;
$$;

-- Grant execute to the service role (used by Supabase Edge Functions)
GRANT EXECUTE ON FUNCTION apply_mpesa_payment TO service_role;
