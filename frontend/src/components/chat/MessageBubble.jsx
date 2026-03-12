import Avatar from "../ui/Avatar";

export default function MessageBubble({ message, isOwn }) {
  if (message.type === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  const time = new Date(message.created_at).toLocaleTimeString("pl-PL", {
    hour:   "2-digit",
    minute: "2-digit"
  });

  if (isOwn) {
    return (
      <div className="flex justify-end gap-2 group">
        <div className="flex flex-col items-end gap-1 max-w-xs lg:max-w-md">
          <div className="bg-teal-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed">
            {message.content}
          </div>
          <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition">
            {time}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 group">
      <Avatar name={message.display_name} size="sm" className="mt-1 flex-shrink-0" />
      <div className="flex flex-col gap-1 max-w-xs lg:max-w-md">
        <span className="text-xs font-semibold text-slate-700">
          {message.display_name}
        </span>
        <div className="bg-white border border-slate-200 text-slate-800 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed shadow-sm">
          {message.content}
        </div>
        <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition">
          {time}
        </span>
      </div>
    </div>
  );
}

