import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "react-hot-toast";


export const metadata = {
  title: "crm.koopindia.com",
  description: "Internal tool for Koop India",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`antialiased`}
      >
        {children}
          <Toaster
          position="top-center"
          toastOptions={{
            style: { zIndex: 999999999 },
          }}
        />  
      </body>
    </html>
  );
}
