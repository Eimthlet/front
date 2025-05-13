import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface PaymentProps {
  onSuccess: () => void;
  onError: (error: string) => void;
  onClose: () => void;
  email: string;
  name: string;
}

declare global {
  interface Window {
    PaychanguCheckout: (config: any) => void;
    makePayment?: () => void;
  }
}

const Payment: React.FC<PaymentProps> = ({
  onSuccess,
  onError,
  onClose,
  email,
  name
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    const txRef = `QUIZ_${Date.now()}_${Math.floor((Math.random() * 1000000000) + 1)}`;
    
    // Create payment function
    window.makePayment = () => {
      try {
        window.PaychanguCheckout({
          public_key: process.env.REACT_APP_PAYCHANGU_PUBLIC_KEY || '',
          tx_ref: txRef,
          amount: 1000,
          currency: "MWK",
          callback_url: `${window.location.origin}/payment/verify/${txRef}`,
          return_url: `${window.location.origin}/register`,
          customer: {
            email: email,
            first_name: name,
            last_name: "",
          },
          customization: {
            title: "Quiz Registration",
            description: "Registration fee payment",
          },
          meta: {
            user_id: email,
            type: "registration",
            tx_ref: txRef
          }
        });
      } catch (error) {
        onError('Payment initialization failed');
        onClose();
      }
    };

    // Create and append payment form
    const form = document.createElement('form');
    form.innerHTML = `
      <div class="payment-modal">
        <div class="payment-content">
          <h2>Complete Registration Payment</h2>
          <p>Amount: MWK 1,000</p>
          <div id="wrapper"></div>
          <button type="button" onClick="makePayment()">Pay Now</button>
          <button type="button" class="cancel-btn" onClick="document.querySelector('.payment-modal').remove()">Cancel</button>
        </div>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .payment-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999999;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .payment-content {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        text-align: center;
        max-width: 400px;
        width: 90%;
      }
      .payment-content h2 {
        margin-bottom: 1rem;
        color: #333;
      }
      .payment-content p {
        margin-bottom: 2rem;
        color: #666;
      }
      .payment-content button {
        padding: 12px 24px;
        border: none;
        border-radius: 4px;
        font-size: 16px;
        cursor: pointer;
        transition: background 0.3s;
        margin: 0.5rem;
      }
      .payment-content button[onclick="makePayment()"] {
        background: #43cea2;
        color: white;
      }
      .payment-content button.cancel-btn {
        background: #ff4444;
        color: white;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(form);

    // Add URL change listener for payment completion
    const handleUrlChange = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const status = urlParams.get('status');
      const returnedTxRef = urlParams.get('tx_ref');

      if (status && returnedTxRef) {
        if (status === 'successful' && returnedTxRef === txRef) {
          try {
            await onSuccess();
            navigate('/quiz');
          } catch (error) {
            onError('Registration failed after payment');
            navigate('/register');
          }
        } else {
          onError('Payment failed or was cancelled');
          navigate('/register');
        }
        onClose();
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('load', handleUrlChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('load', handleUrlChange);
      if (form && form.parentNode) {
        form.parentNode.removeChild(form);
      }
      if (style && style.parentNode) {
        style.parentNode.removeChild(style);
      }
      delete window.makePayment;
    };
  }, [email, name, onSuccess, onError, onClose, navigate]);

  return null;
};

export default Payment; 