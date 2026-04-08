"use client";

import { useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import { sendEmailVerification } from "firebase/auth";
import { useState } from "react";

export default function Verify() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const resend = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    await sendEmailVerification(auth.currentUser);
    alert("Email sent again!");
    setLoading(false);
  };

  return (
    <div style={container}>
      <h1>📩 Check your email</h1>

      <p>
        We sent you a verification link.  
        Please confirm your email before continuing.
      </p>

      <button style={btn} onClick={resend}>
        {loading ? "Sending..." : "Resend email"}
      </button>

      <button style={btn2} onClick={() => router.refresh()}>
        I already verified
      </button>
    </div>
  );
}

const container: any = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  background: "#05070a",
  color: "white",
  padding: 20,
};

const btn: any = {
  marginTop: 20,
  padding: 14,
  background: "#e8b84b",
  borderRadius: 10,
};

const btn2: any = {
  marginTop: 10,
  padding: 12,
  background: "#0b1220",
  borderRadius: 10,
};