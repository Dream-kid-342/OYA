import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import App from './App';
import './index.css';

const OYA_THEME = {
  token: {
    colorPrimary: '#4A2E13',
    colorBgLayout: '#FAFAD2',
    colorSuccess: '#388E3C',
    colorWarning: '#F9A825',
    colorError: '#C62828',
    colorInfo: '#1565C0',
    borderRadius: 8,
    borderRadiusSM: 4,
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
  },
  components: {
    Button: {
      colorPrimary: '#4A2E13',
      algorithm: true,
    },
    Layout: {
      siderBg: '#4A2E13',
      triggerBg: '#4A2E13',
      bodyBg: '#FAFAD2',
    },
    Menu: {
      darkItemBg: '#4A2E13',
      darkItemSelectedBg: 'rgba(250, 250, 210, 0.2)',
      darkItemColor: 'rgba(250, 250, 210, 0.75)',
      darkItemSelectedColor: '#FAFAD2',
      darkItemHoverBg: 'rgba(250, 250, 210, 0.1)',
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={OYA_THEME}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
