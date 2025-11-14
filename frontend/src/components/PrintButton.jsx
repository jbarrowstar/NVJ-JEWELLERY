// components/PrintButton.jsx
import React from 'react';

export default function PrintButton() {
  const handlePrint = async () => {
    try {
      await window.api.print();
      console.log('Print dialog opened successfully');
    } catch (err) {
      console.error('Print failed:', err);
    }
  };

  return (
    <button onClick={handlePrint}>
      Print
    </button>
  );
}
