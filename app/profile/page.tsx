"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import { signOut } from "firebase/auth";

export default function Profile() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [lang, setLang] = useState("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setName(localStorage.getItem("userName") || "");
      setLang(localStorage.getItem("lang") || "en");
    }
  }, []);

  const changeLang = (l:string)=>{
    setLang(l);
    localStorage.setItem("lang",l);
  };

  const logout = async ()=>{
    await signOut(auth);
    localStorage.clear();
    router.push("/login");
  };

  return (
    <div style={container}>
      <h1 style={title}>{name.toUpperCase()}</h1>

      <div style={card}>🌍 Language</div>

      <div style={row}>
        <button style={langBtn} onClick={()=>changeLang("fr")}>🇫🇷</button>
        <button style={langBtn} onClick={()=>changeLang("en")}>🇺🇸</button>
        <button style={langBtn} onClick={()=>changeLang("es")}>🇪🇸</button>
      </div>

      <div style={card}>Edit profile</div>

      <div style={danger} onClick={logout}>🚪 Logout</div>

      <BottomNav router={router} active="profile"/>
    </div>
  );
}

function BottomNav({ router, active }: any) {
  return (
    <div style={nav}>
      <div style={active==="home"?navActive:navItem} onClick={()=>router.push("/dashboard")}>🏠</div>
      <div style={active==="steps"?navActive:navItem} onClick={()=>router.push("/steps")}>📋</div>
      <div style={active==="guide"?navActive:navItem} onClick={()=>router.push("/guide")}>📍</div>
      <div style={active==="profile"?navActive:navItem} onClick={()=>router.push("/profile")}>👤</div>
    </div>
  );
}

const container:any={background:"#05070a",minHeight:"100vh",padding:20,paddingBottom:100,color:"white"};
const title:any={fontSize:28,fontWeight:"bold",marginBottom:20};
const card:any={background:"#0b1220",padding:18,borderRadius:16,marginBottom:15};
const danger:any={...card,background:"#1a0b0b",color:"#ff4d4d"};
const row:any={display:"flex",gap:10,marginBottom:20};
const langBtn:any={padding:10,fontSize:18,borderRadius:10};
const nav:any={position:"fixed",bottom:0,left:0,right:0,height:70,background:"#05070a",display:"flex",justifyContent:"space-around",alignItems:"center"};
const navItem:any={fontSize:22,color:"#777"};
const navActive:any={fontSize:22,color:"#e8b84b"};