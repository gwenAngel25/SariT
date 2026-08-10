import './globals.css';

export const metadata = {
  title: 'SariTrack',
  description: 'Cloud-Based Order Staging and Smart Queue Management System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="page">{children}</div>
      </body>
    </html>
  );
}