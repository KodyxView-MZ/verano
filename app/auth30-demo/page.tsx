import { Auth30 } from '@/components/ui/auth30';

export default function Auth30Demo() {
  return (
    <Auth30
      heading="Enter your PIN"
      description="Use your 4-digit PIN to unlock your account."
      pinLength={4}
      labels={{ biometric: 'Use biometrics', backspace: 'Delete' }}
      forgotPrompt={{
        text: 'Forgot your PIN?',
        linkLabel: 'Reset it',
        href: 'https://beste.co',
      }}
    />
  );
}
