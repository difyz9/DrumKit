import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '3D Drum Kit',
  description: 'Interactive 3D drum kit — React Three Fiber + Web Audio',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
