import { useMemo } from "react";
import { Sun, Coffee, Sunset, Moon, Star } from "lucide-react";

function getGreeting(hour) {
  if (hour >= 5  && hour < 12) return { text: "Good Morning",   Icon: Sun,    gradient: "from-amber-400 to-orange-400",  bg: "from-amber-50 to-orange-50",   border: "border-amber-200", sub: "Hope you have a productive day ahead!" };
  if (hour >= 12 && hour < 17) return { text: "Good Afternoon", Icon: Coffee, gradient: "from-blue-400 to-cyan-400",    bg: "from-blue-50 to-cyan-50",      border: "border-blue-200",  sub: "Keep up the great work!" };
  if (hour >= 17 && hour < 21) return { text: "Good Evening",   Icon: Sunset, gradient: "from-purple-400 to-pink-400", bg: "from-purple-50 to-pink-50",    border: "border-purple-200",sub: "Wrapping up for the day?" };
  return                               { text: "Good Night",     Icon: Moon,   gradient: "from-slate-500 to-indigo-500", bg: "from-slate-50 to-indigo-50",   border: "border-slate-200", sub: "Working late — you're dedicated!" };
}

function getFirstName(fullName = "") {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}

function fmtDate(date) {
  return date.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export default function GreetingBanner() {
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const now  = useMemo(() => new Date(), []);
  const hour = now.getHours();
  const { text, Icon, gradient, bg, border, sub } = getGreeting(hour);
  const firstName = getFirstName(user.full_name);

  return (
    <div className={`bg-gradient-to-r ${bg} border ${border} rounded-2xl px-6 py-4 flex items-center justify-between gap-4 shadow-sm`}>
      {/* Left: greeting text */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Icon bubble */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
          <Icon size={22} className="text-white" />
        </div>

        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800 leading-tight">
            {text},{" "}
            <span className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
              {firstName}!
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
        </div>
      </div>

      {/* Right: date + star */}
      <div className="flex-shrink-0 hidden sm:flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1.5">
          <Star size={11} className="text-amber-400 fill-amber-400" />
          <span className="text-xs font-semibold text-slate-600">{fmtDate(now)}</span>
        </div>
        <span className="text-xs text-slate-400">
          {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
        </span>
      </div>
    </div>
  );
}
