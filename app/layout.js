import { Anton, Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

// Anton for display: a condensed poster face, closer to a marquee board than
// to UI type. Inter carries everything that has to be read rather than seen.
const display = Anton({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata = {
  title: "BookOnly",
  description: "Book seats for movies and concerts",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Sidebar />
        {/* Offset by the rail on desktop; full width underneath the top bar on
            mobile. Wide gutters rather than a narrow centred column. */}
        <main
          className="relative z-10 px-4 py-8 sm:px-8 lg:py-12"
          style={{ marginInlineStart: "var(--main-offset, 0px)" }}
        >
          <div className="mx-auto w-full max-w-[1180px]">{children}</div>
        </main>
      </body>
    </html>
  );
}
