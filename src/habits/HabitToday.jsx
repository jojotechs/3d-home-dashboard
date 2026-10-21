import {Check,Plant,CaretRight} from '@phosphor-icons/react';
import {habitError} from './client';

export function HabitToday({farmState,onSelect}) {
  const {farm,status,error}=farmState;
  return <section className="habit-today" aria-label="我的今日习惯">
    <div className="task-section-label">我的习惯 <span>{farm?.habit_day??'云端记录'}</span></div>
    {!farm?<p className="habit-today-note">{status==='loading'?'正在读取个人习惯…':error?habitError(error):'进入农场读取你的习惯。'}</p>
      :farm.habits.length===0?<p className="habit-today-note">还没有习惯，从一件小事开始。</p>
      :farm.habits.map(habit=><button key={habit.id} className="habit-today-row" onClick={()=>onSelect(habit.id)}>
        <span className={habit.today.completed?'checked-circle':'empty-check'}>{habit.today.completed&&<Check size={14}/>}</span>
        <span><strong>{habit.name}</strong><small>{habit.today.completed?'今日已记录':'今天还未记录'} · 仅自己</small></span>
        <CaretRight size={16}/>
      </button>)}
    <button className="text-button" onClick={()=>onSelect(null)}><Plant size={18}/>进入个人农场<CaretRight size={16}/></button>
  </section>;
}
