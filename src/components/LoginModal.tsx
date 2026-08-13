import React from 'react';
import { SapUser, SAPSession } from '../types/sap';
import LoginScreen from './LoginScreen';

interface LoginModalProps {
  onLoginSuccess: (user: SapUser, session?: SAPSession) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <LoginScreen 
      onLoginSuccess={(user, session) => {
        onLoginSuccess(user, session);
        onClose();
      }}
      isModal={true}
      onClose={onClose}
      theme="dark"
    />
  );
};
