import React from "react";
import "./AdminAnalytics.css";
const stats=[{title:"Users",value:1245},{title:"Books",value:862},{title:"Orders",value:391},{title:"Revenue",value:"$12,450"}];
const orders=[{id:101,user:"Alice",amount:"$59"},{id:102,user:"Bob",amount:"$32"},{id:103,user:"Charlie",amount:"$88"}];
export default function AdminAnalytics(){
return(<div className="analytics"><h1>Admin Analytics Dashboard</h1>
<div className="analytics__grid">{stats.map((s,i)=><div key={i} className="analytics__card"><h3>{s.title}</h3><p>{s.value}</p></div>)}</div>
<div className="analytics__section"><h2>Recent Orders</h2><table><thead><tr><th>ID</th><th>User</th><th>Amount</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td>{o.id}</td><td>{o.user}</td><td>{o.amount}</td></tr>)}</tbody></table></div>
<div className="analytics__section"><h2>Popular Books</h2><ul><li>Atomic Habits</li><li>Deep Work</li><li>Clean Code</li></ul></div>
<div className="analytics__section"><h2>Monthly Target</h2><div className="progress"><span style={{width:"75%"}}></span></div><p>75% completed</p></div></div>);}