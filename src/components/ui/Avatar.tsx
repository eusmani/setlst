interface Props {
  username: string;
  avatar?: string | null;
  size?: number;
}

export default function Avatar({ username, avatar, size = 32 }: Props) {
  if (avatar) {
    return (
      <img src={avatar} alt={username} width={size} height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }} />
    );
  }
  const hue = (username.charCodeAt(0) * 43 + username.charCodeAt(1) * 17) % 360;
  return (
    <div
      className="rounded-full flex items-center justify-center  text-[#f0f0f0] shrink-0"
      style={{
        width: size, height: size,
        fontSize: size * 0.37,
        background: `hsl(${hue}, 25%, 22%)`,
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {username.slice(0, 2).toUpperCase()}
    </div>
  );
}
