"use client";

import { useRouter } from "next/navigation";

export default function Steps() {
  const router = useRouter();

  return (
    <div style={container}>
      <h1 style={title}>📋 Steps</h1>

      <div style={card}>SSN</div>
      <div style={card}>Phone</div>
      <div style={card}>Bank</div>

      <BottomNav router={router} active="steps"/>
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
const nav:any={position:"fixed",bottom:0,left:0,right:0,height:70,background:"#05070a",display:"flex",justifyContent:"space-around",alignItems:"center"};
const navItem:any={fontSize:22,color:"#777"};
const navActive:any={fontSize:22,color:"#e8b84b"};