import React, { useEffect, useRef, useState } from 'react';
import jQuery from 'jquery';

interface PayChanguPopupSDK {
  initiate: (options: PayChanguOptions) => void;
}

interface PayChanguOptions {
  public_key: string;
  amount: number;
  currency: string;
  reference: string;
  email: string;
  first_name: string;
  last_name: string;
  title: string;
  description: string;
  container: string;
  onClose?: () => void;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
}

declare global {
  interface Window {
    PopupSDK: PayChanguPopupSDK;
    $: typeof jQuery;
  }
}

interface PaymentButtonProps {
  amount: number;
  email: string;
  firstName: string;
  lastName: string;
  onSuccess: (response: any) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  amount,
  email,
  firstName,
  lastName,
  onSuccess,
  onError,
  onClose
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Ensure the container is ready for PayChangu
    if (containerRef.current) {
      const containerId = 'paychangu-container';
      containerRef.current.id = containerId;
    }
  }, []);

  const handlePayment = () => {
    setIsLoading(true);

    // Ensure jQuery and PopupSDK are available
    if (!window.$ || !window.PopupSDK) {
      console.error('Required dependencies not loaded');
      setIsLoading(false);
      return;
    }

    const reference = `QUIZ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      window.PopupSDK.initiate({
        public_key: process.env.REACT_APP_PAYCHANGU_PUBLIC_KEY || '',
        amount: amount,
        currency: 'MWK',
        reference: reference,
        email: email,
        first_name: firstName,
        last_name: lastName,
        title: 'Quiz Payment',
        description: 'Payment for quiz access',
        container: 'paychangu-container',
        onSuccess: (response) => {
          setIsLoading(false);
          onSuccess(response);
        },
        onError: (error) => {
          setIsLoading(false);
          if (onError) onError(error);
        },
        onClose: () => {
          setIsLoading(false);
          if (onClose) onClose();
        }
      });
    } catch (error) {
      console.error('PayChangu initialization error:', error);
      setIsLoading(false);
      if (onError) onError(error);
    }
  };

  return (
    <div>
      <div ref={containerRef} style={{ display: 'none' }} />
      <button
        ref={buttonRef}
        onClick={handlePayment}
        disabled={isLoading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      >
        {isLoading ? 'Processing...' : 'Pay Now'}
      </button>
    </div>
  );
};

export default PaymentButton; 