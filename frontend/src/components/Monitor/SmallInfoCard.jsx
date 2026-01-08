const SmallInfoCard = ({ label, value, icon, color }) => {
    const colors = {
        indigo: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50",
        amber: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50",
        emerald: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50",
        rose: "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50",
    };
    return (
        <div className={`rounded-xl px-3 py-2 border flex items-center justify-between ${colors[color]}`}>
            <div className="flex items-center gap-2 opacity-80">
                {icon}
                <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-base font-black tracking-tight text-slate-800 dark:text-slate-200">{value}</div>
        </div>
    )
}

export default SmallInfoCard;
