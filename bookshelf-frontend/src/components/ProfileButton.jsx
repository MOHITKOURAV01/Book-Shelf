import "./ProfileButton.css";

export default function ProfileButton({
  label = "Profile",
  icon = "👤",
  disabled = false,
  onClick = () => {},
}) {
  return (
    <button
      className={`profile-button ${disabled ? "profile-button--disabled" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <span className="profile-button__icon">{icon}</span>
      <span className="profile-button__label">{label}</span>
    </button>
  );
}
