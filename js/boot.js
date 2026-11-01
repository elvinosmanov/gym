/* ================= boot ================= */
(function(){
  const d=new Date();
  $("#dateChip").innerHTML = `<b>${d.toLocaleDateString("az",{weekday:"long"})}</b><br>${d.toLocaleDateString("az",{day:"numeric",month:"short",year:"numeric"})}`;
})();
loadState().then(()=>{ autoFinishStale(); resumeTimer(); renderSaveNote(); renderToday(); });
window.addEventListener("load", ()=>{
  sbBoot();                                    /* after the deferred Supabase CDN script */
  /* Offline shell. Needs https (Netlify) or localhost — silently skipped on file:// */
  if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
});
