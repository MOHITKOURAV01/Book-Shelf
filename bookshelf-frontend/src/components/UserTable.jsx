import React,{useState} from "react";
import "./UserTable.css";
const data=[
{id:1,name:"Alice",email:"alice@example.com",role:"Admin"},
{id:2,name:"Bob",email:"bob@example.com",role:"User"},
{id:3,name:"Charlie",email:"charlie@example.com",role:"Moderator"},
{id:4,name:"David",email:"david@example.com",role:"User"},
{id:5,name:"Eva",email:"eva@example.com",role:"User"},
];
export default function UserTable(){
 const [search,setSearch]=useState("");
 const users=data.filter(u=>u.name.toLowerCase().includes(search.toLowerCase())||u.email.toLowerCase().includes(search.toLowerCase()));
 return(<div className="user-table">
<h2>User Management</h2>
<input className="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users..."/>
<table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th></tr></thead>
<tbody>{users.map(u=><tr key={u.id}><td>{u.id}</td><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td></tr>)}</tbody>
</table></div>);
}