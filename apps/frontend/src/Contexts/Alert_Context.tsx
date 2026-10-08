import { createContext, useContext, useState, type ReactNode } from 'react';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface Alert {
  open: boolean;
  message: string;
  type: AlertType | '';
}

interface AlertContextType {
  alert: Alert;
  setAlert: React.Dispatch<React.SetStateAction<Alert>>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<Alert>({
    open: false,
    message: '',
    type: '',
  });

  return (
    <AlertContext.Provider value={{ alert, setAlert }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
