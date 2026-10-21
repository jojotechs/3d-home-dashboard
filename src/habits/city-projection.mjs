import {tasks,taskDone,localDay} from '../city-state.mjs';

// Legacy habits remain in saved demo archives, never in the live personal farm.
export function projectToday(state,farm,day=localDay()) {
  const living=tasks.filter(task=>task.district!=='habits');
  const pending=living.filter(task=>!taskDone(state,task,day));
  const demo={total:living.length,completed:living.length-pending.length,pending};
  // The server's habit day differs from the living-demo calendar before 04:00.
  // Consume its confirmed result instead of reinterpreting records on the client.
  const own=farm?.habits??[];
  const habitPending=own.filter(habit=>!habit.today.completed).map(habit=>({
    id:habit.id,title:habit.name,district:'habits',detail:`个人习惯 · ${farm.habit_day}`,
  }));
  const habits={total:own.length,completed:own.length-habitPending.length,pending:habitPending};
  return {demo,habits,total:demo.total+habits.total,completed:demo.completed+habits.completed};
}
