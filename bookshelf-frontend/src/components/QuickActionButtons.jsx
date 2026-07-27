import "./QuickActionButtons.css";

const actions=[
{label:"Wishlist",icon:"❤️"},
{label:"Cart",icon:"🛒"},
{label:"Orders",icon:"📦"},
{label:"Profile",icon:"👤"},
{label:"Browse Books",icon:"📚"},
];

export default function QuickActionButtons({onAction=()=>{}}){
return(
<div className="quick-actions">
{actions.map((action)=>(
<button key={action.label} className="quick-actions__button" onClick={()=>onAction(action.label)}>
<span className="quick-actions__icon">{action.icon}</span>
<span>{action.label}</span>
</button>
))}
</div>
);
}
