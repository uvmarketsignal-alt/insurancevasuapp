import { motion } from 'framer-motion';
import { Trophy, Medal } from 'lucide-react';
import { useStore } from '../store';

export default function EmployeeLeaderboard() {
  const { employees, commissions } = useStore();

  // Calculate employee performance based on commissions
  const performance = employees.map(emp => {
    // Note: If employees array has generic role 'employee', we map their IDs.
    // In our mock store, employee components use 'tenant_id' or 'id'.
    // Here we assume commission has 'employee_id'
    const empCommissions = commissions.filter(c => c.employee_id === emp.tenant_id);
    const totalCommission = empCommissions.reduce((sum, c) => sum + c.commission_amount, 0);

    return {
      id: emp.id,
      name: (emp as any).profile?.full_name || (emp as any).full_name || 'Agent',
      avatar: (emp as any).profile?.avatar_url || (emp as any).avatar_url,
      totalCommission,
      deals: empCommissions.length
    };
  }).filter(p => p.totalCommission > 0).sort((a, b) => b.totalCommission - a.totalCommission);

  if (performance.length === 0) {
    return (
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow border border-white/20 p-6 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
            <Trophy className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-lg font-semibold text-slate-700">No Data Yet</h3>
            <p className="text-slate-500 text-sm">Commissions data is required to generate the leaderboard.</p>
        </div>
    );
  }

  const top3 = performance.slice(0, 3);
  const rest = performance.slice(3, 10); // Show up to top 10

  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl shadow border border-white/20 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
          <Trophy className="w-5 h-5 text-yellow-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Top Performers</h2>
          <p className="text-sm text-slate-500">Based on total commissions earned</p>
        </div>
      </div>

      {/* Podium for Top 3 */}
      <div className="flex items-end justify-center gap-2 sm:gap-4 mb-8 pt-4">
        {top3[1] && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="flex flex-col items-center w-1/3">
            <div className="relative mb-2">
              <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-lg font-bold text-slate-500 border-2 border-slate-300">
                {top3[1].name.charAt(0)}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-slate-100 rounded-full p-1 border border-slate-300 shadow-sm">
                <Medal className="w-4 h-4 text-slate-500" />
              </div>
            </div>
            <div className="text-sm font-semibold text-slate-700 truncate w-full text-center">{top3[1].name.split(' ')[0]}</div>
            <div className="text-xs text-slate-500 font-medium">₹{(top3[1].totalCommission / 1000).toFixed(1)}k</div>
            <div className="w-full bg-gradient-to-t from-slate-200 to-slate-100 rounded-t-lg h-24 mt-2 border-t border-x border-slate-300/50 relative overflow-hidden flex justify-center">
               <span className="absolute bottom-2 font-bold text-slate-400 text-2xl">2</span>
            </div>
          </motion.div>
        )}

        {top3[0] && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="flex flex-col items-center w-1/3 z-10">
            <div className="relative mb-2">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center text-xl font-bold text-yellow-600 border-2 border-yellow-400 shadow-md">
                {top3[0].name.charAt(0)}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-yellow-50 rounded-full p-1.5 border border-yellow-300 shadow-sm">
                <Medal className="w-5 h-5 text-yellow-500" />
              </div>
            </div>
            <div className="text-sm font-bold text-slate-900 truncate w-full text-center">{top3[0].name.split(' ')[0]}</div>
            <div className="text-xs text-yellow-600 font-bold">₹{(top3[0].totalCommission / 1000).toFixed(1)}k</div>
            <div className="w-full bg-gradient-to-t from-yellow-200 to-yellow-100 rounded-t-lg h-32 mt-2 border-t border-x border-yellow-300/50 shadow-inner relative overflow-hidden flex justify-center">
                <span className="absolute bottom-2 font-black text-yellow-500/50 text-4xl">1</span>
            </div>
          </motion.div>
        )}

        {top3[2] && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="flex flex-col items-center w-1/3">
            <div className="relative mb-2">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-lg font-bold text-orange-700 border-2 border-orange-300">
                {top3[2].name.charAt(0)}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-orange-50 rounded-full p-1 border border-orange-200 shadow-sm">
                <Medal className="w-4 h-4 text-orange-600" />
              </div>
            </div>
            <div className="text-sm font-semibold text-slate-700 truncate w-full text-center">{top3[2].name.split(' ')[0]}</div>
            <div className="text-xs text-slate-500 font-medium">₹{(top3[2].totalCommission / 1000).toFixed(1)}k</div>
            <div className="w-full bg-gradient-to-t from-orange-200/50 to-orange-50 rounded-t-lg h-16 mt-2 border-t border-x border-orange-200 relative overflow-hidden flex justify-center">
                <span className="absolute bottom-2 font-bold text-orange-300 text-xl">3</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* List for the rest */}
      {rest.length > 0 && (
        <div className="space-y-3 mt-6 pt-6 border-t border-slate-100">
          {rest.map((emp, index) => (
            <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-bold text-slate-400">{index + 4}</span>
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{emp.name}</p>
                  <p className="text-xs text-slate-500">{emp.deals} deals closed</p>
                </div>
              </div>
              <span className="text-sm font-bold text-emerald-600">₹{(emp.totalCommission / 1000).toFixed(1)}k</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
