/* ============================================================
   Exercise library.

   m.p / m.s  primary / secondary muscles (keys from muscles.js)
   load       loadType from units.js — decides what the kg box means
   range      'heavy' (6-9, compounds) or 'pump' (10-14, isolation)
   anim       movement pattern key -> drawn SVG animation (always works offline)
   q          YouTube search query for the demo video
   ============================================================ */

const E = (id, name, o) => ({
  id, name,
  aka: o.aka || "",
  m: o.m,
  eq: o.eq,
  load: o.load,
  range: o.range,
  sets: o.sets || (o.range === "heavy" ? 3 : 3),
  rest: o.rest || (o.range === "heavy" ? 150 : 75),
  uni: !!o.uni,
  level: o.level || "any",
  setup: o.setup || [],
  cues: o.cues || [],
  mist: o.mist || [],
  anim: o.anim,
  q: o.q || name + " proper form"
});

export const EXERCISES = [

  /* ================= CHEST ================= */
  E("bp", "Barbell Bench Press", {
    m: { p: ["chest"], s: ["triceps", "front_delt"] }, eq: "barbell", load: "barbell",
    range: "heavy", sets: 4, rest: 180, anim: "press_h",
    setup: [
      "Lie back so your eyes are directly under the bar.",
      "Grip a little wider than shoulder width, wrists stacked over the elbows.",
      "Pull your shoulder blades back and down and hold them there; small arch, feet flat and planted."
    ],
    cues: [
      "Take a big breath and brace before you unrack.",
      "Lower under control to the lower chest — elbows about 45° from your torso, not flared to 90°.",
      "Touch the chest, then press up and slightly back so the bar finishes over your shoulders.",
      "Keep driving your feet into the floor the whole set."
    ],
    mist: [
      "Bouncing the bar off the chest.",
      "Elbows flared straight out — the fastest way to an angry shoulder.",
      "Hips lifting off the bench.",
      "Half reps that never reach the chest."
    ]
  }),
  E("idp", "Incline Dumbbell Press", {
    m: { p: ["chest"], s: ["front_delt", "triceps"] }, eq: "dumbbell", load: "dumbbell_pair",
    range: "heavy", rest: 120, anim: "press_h",
    setup: [
      "Set the bench to about 30°. Steeper than that and it becomes a shoulder press.",
      "Sit down, dumbbells on your thighs, then kick them up one at a time as you lie back."
    ],
    cues: [
      "Start with the dumbbells at the sides of your upper chest.",
      "Press up and slightly together without clanging them at the top.",
      "Lower slowly to a deep stretch across the upper chest.",
      "Keep the shoulder blades pinned back throughout."
    ],
    mist: ["Bench set too steep.", "Cutting the stretch short at the bottom.", "Bouncing out of the bottom."]
  }),
  E("dbp", "Flat Dumbbell Press", {
    m: { p: ["chest"], s: ["triceps", "front_delt"] }, eq: "dumbbell", load: "dumbbell_pair",
    range: "heavy", rest: 120, anim: "press_h",
    setup: ["Flat bench, dumbbells on the thighs, kick them into position as you lie back."],
    cues: ["Wrists stacked over the elbows.", "Deep stretch at the bottom, no clanging at the top.", "Blades pinned back into the bench."],
    mist: ["Letting the elbows drift up by your ears.", "Turning it into a fly by dropping the elbows out wide."]
  }),
  E("incbp", "Incline Barbell Press", {
    m: { p: ["chest"], s: ["front_delt", "triceps"] }, eq: "barbell", load: "barbell",
    range: "heavy", rest: 150, anim: "press_h",
    setup: ["Bench at 30°, eyes under the bar, blades pinned back."],
    cues: ["Lower to just below the collarbone.", "Elbows tucked to roughly 45°.", "Press in a straight line up."],
    mist: ["Bench too upright.", "Bar drifting toward the throat."]
  }),
  E("fly", "Cable Chest Fly", {
    m: { p: ["chest"], s: ["front_delt"] }, eq: "cable", load: "cable",
    range: "pump", rest: 60, anim: "fly",
    setup: ["Set both pulleys at or just above shoulder height.", "Step forward into a split stance with a slight forward lean."],
    cues: [
      "Elbows softly bent and LOCKED in that angle for the whole rep.",
      "Hug the handles together and squeeze the inner chest for a full second.",
      "Open back up slowly to a deep stretch — the stretch is where the growth is."
    ],
    mist: [
      "Bending the elbows more as it gets hard — that turns it into a press.",
      "Shoulders rolling forward at the stretch.",
      "Loading it too heavy; this is a finisher, chase the squeeze."
    ]
  }),
  E("pecdeck", "Pec Deck / Machine Fly", {
    m: { p: ["chest"], s: ["front_delt"] }, eq: "machine", load: "machine_stack",
    range: "pump", rest: 60, anim: "fly",
    setup: ["Set the seat so the handles sit at mid-chest height."],
    cues: ["Back flat on the pad, chest tall.", "Squeeze for a second in the middle.", "Control the way back out."],
    mist: ["Shrugging as you squeeze.", "Slamming the pads together."]
  }),
  E("dbfly", "Dumbbell Fly", {
    m: { p: ["chest"], s: ["front_delt"] }, eq: "dumbbell", load: "dumbbell_pair",
    range: "pump", rest: 60, anim: "fly",
    setup: ["Flat or slightly inclined bench, dumbbells pressed out over the chest."],
    cues: ["Soft fixed elbow bend.", "Open in a wide arc to a chest stretch.", "Bring them back like hugging a barrel."],
    mist: ["Going too heavy and pressing instead of flying.", "Dropping below a comfortable shoulder stretch."]
  }),
  E("dip", "Chest Dip", {
    m: { p: ["chest"], s: ["triceps", "front_delt"] }, eq: "bodyweight", load: "bodyweight",
    range: "heavy", rest: 120, anim: "press_h",
    setup: ["Grip the bars, arms locked, then lean your torso forward about 30°."],
    cues: ["Keep the forward lean the whole set — that is what makes it a chest exercise.", "Lower until you feel a stretch across the chest.", "Press back up without losing the lean."],
    mist: ["Going straight up and down (that's a triceps dip).", "Dropping so deep the shoulders roll forward.", "Bouncing at the bottom."]
  }),
  E("pushup", "Push-Up", {
    m: { p: ["chest"], s: ["triceps", "front_delt", "abs"] }, eq: "bodyweight", load: "bodyweight",
    range: "pump", rest: 60, anim: "press_h",
    setup: ["Hands slightly wider than the shoulders, body in one straight line from head to heels."],
    cues: ["Squeeze the glutes and brace the abs so the hips do not sag.", "Elbows back at ~45°, not out to the sides.", "Chest to the floor, full lockout at the top."],
    mist: ["Hips sagging or piking up.", "Head craning forward.", "Half reps."]
  }),

  /* ================= BACK ================= */
  E("dl", "Deadlift", {
    m: { p: ["lower_back", "hamstring", "glute"], s: ["trap", "lat", "forearm", "quad"] },
    eq: "barbell", load: "barbell", range: "heavy", sets: 3, rest: 210, anim: "hinge",
    setup: [
      "Bar over mid-foot, shins about an inch away.",
      "Hinge down and take a grip just outside your knees.",
      "Drop the hips until your shins touch the bar, chest up, back flat."
    ],
    cues: [
      "Pull the slack out of the bar before you pull — you should hear it click.",
      "Squeeze your lats like you are holding oranges in your armpits.",
      "Big brace, then push the floor away; the bar drags up your legs.",
      "Lock hips and knees at the same time. Reset your brace every rep."
    ],
    mist: [
      "Rounding the lower back off the floor.",
      "Letting the bar drift away from the body.",
      "Jerking the bar instead of building tension first.",
      "Leaning back and hyperextending at lockout."
    ]
  }),
  E("row", "Seated Cable Row", {
    m: { p: ["upper_back", "lat"], s: ["biceps", "rear_delt", "forearm"] },
    eq: "cable", load: "cable", range: "heavy", rest: 120, anim: "row_h",
    setup: ["Feet on the platform, soft knees, sit tall with your chest up."],
    cues: [
      "Reach forward and let the shoulder blades open for a real stretch.",
      "Pull the handle to your belly button, elbows tight to your body.",
      "Squeeze the shoulder blades together for one full second.",
      "Return under control — do not let the stack pull you forward."
    ],
    mist: ["Rocking back and forth for momentum.", "Shrugging the shoulders up to the ears.", "Rounding the back in the stretch under heavy load."]
  }),
  E("bor", "Barbell Row", {
    m: { p: ["upper_back", "lat"], s: ["biceps", "rear_delt", "lower_back"] },
    eq: "barbell", load: "barbell", range: "heavy", rest: 150, anim: "row_h",
    setup: ["Hinge to about 45°, back flat, bar hanging under the shoulders."],
    cues: ["Pull to the belly button, elbows in.", "Squeeze at the top, control it down.", "Keep the torso angle fixed for every rep."],
    mist: ["Standing up as you pull.", "Rounding the lower back.", "Using the hips to heave the bar."]
  }),
  E("lp", "Lat Pulldown", {
    m: { p: ["lat"], s: ["biceps", "upper_back", "forearm"] },
    eq: "cable", load: "cable", range: "heavy", sets: 4, rest: 120, anim: "pull_v",
    setup: ["Set the thigh pad so you cannot lift off the seat.", "Grip slightly wider than shoulder width."],
    cues: [
      "Chest up, lean back only slightly and keep that angle.",
      "Drive the elbows DOWN toward your hips — do not think about the hands.",
      "Bar to the upper chest, squeeze the lats for a second.",
      "Control it back to a full overhead stretch every rep."
    ],
    mist: ["Rocking the torso to heave the weight.", "Pulling behind the neck.", "Never reaching a full stretch at the top."]
  }),
  E("pullup", "Pull-Up", {
    m: { p: ["lat"], s: ["biceps", "upper_back", "forearm", "abs"] },
    eq: "bodyweight", load: "bodyweight", range: "heavy", rest: 150, anim: "pull_v",
    setup: ["Grip slightly wider than shoulders, hands over the bar, hang with the shoulders pulled down."],
    cues: ["Start by pulling the shoulder blades down, then bend the arms.", "Drive the elbows down and back.", "Chin over the bar, then lower all the way to straight arms."],
    mist: ["Kipping and swinging.", "Half reps that stop short of a full hang.", "Shrugging up into the ears."]
  }),
  E("chinup", "Chin-Up", {
    m: { p: ["lat", "biceps"], s: ["upper_back", "forearm"] },
    eq: "bodyweight", load: "bodyweight", range: "heavy", rest: 150, anim: "pull_v",
    setup: ["Underhand grip about shoulder width."],
    cues: ["Chest to the bar.", "Full hang at the bottom every rep.", "Squeeze the biceps hard at the top."],
    mist: ["Swinging.", "Stopping short of a full hang."]
  }),
  E("assistpull", "Assisted Pull-Up", {
    m: { p: ["lat"], s: ["biceps", "upper_back"] },
    eq: "machine", load: "assisted", range: "heavy", rest: 120, anim: "pull_v",
    setup: ["Set the assistance weight, kneel or stand on the pad."],
    cues: ["Same rules as a pull-up: blades down first, elbows down and back.", "Progress by using LESS assistance over time."],
    mist: ["Bouncing off the pad.", "Never lowering the assistance."]
  }),
  E("dbrow", "One-Arm Dumbbell Row", {
    m: { p: ["lat", "upper_back"], s: ["biceps", "rear_delt"] },
    eq: "dumbbell", load: "dumbbell_one", range: "heavy", rest: 90, uni: true, anim: "row_h",
    setup: ["One hand and knee on the bench, back flat and parallel to the floor."],
    cues: ["Let the arm hang and the shoulder blade open.", "Pull the elbow up toward your hip.", "Squeeze, then lower to a full stretch."],
    mist: ["Twisting the torso to lift more.", "Pulling to the shoulder instead of the hip.", "Yanking with the lower back."]
  }),
  E("tbar", "T-Bar / Chest-Supported Row", {
    m: { p: ["upper_back", "lat"], s: ["biceps", "rear_delt"] },
    eq: "machine", load: "plate_machine", range: "heavy", rest: 120, anim: "row_h",
    setup: ["Chest on the pad, feet planted."],
    cues: ["Chest stays glued to the pad — that is the point of this one.", "Elbows to the hips, squeeze the blades.", "Full stretch at the bottom."],
    mist: ["Peeling the chest off the pad.", "Half reps at the bottom."]
  }),
  E("pullover", "Cable Straight-Arm Pulldown", {
    m: { p: ["lat"], s: ["abs", "triceps"] },
    eq: "cable", load: "cable", range: "pump", rest: 60, anim: "pull_v",
    setup: ["High pulley, straight bar or rope, step back and hinge slightly."],
    cues: ["Arms stay almost straight the whole time.", "Sweep the bar down to your thighs using the lats.", "Feel the stretch at the top."],
    mist: ["Bending the elbows and turning it into a pushdown.", "Using the whole body to sweep."]
  }),
  E("shrug", "Dumbbell Shrug", {
    m: { p: ["trap"], s: ["forearm"] },
    eq: "dumbbell", load: "dumbbell_pair", range: "pump", rest: 60, anim: "shrug",
    setup: ["Stand tall, dumbbells at your sides, arms straight."],
    cues: ["Shrug straight UP toward the ears, not in circles.", "Pause and squeeze at the top for a second.", "Lower all the way down for a stretch."],
    mist: ["Rolling the shoulders.", "Bending the elbows.", "Tiny bouncing reps."]
  }),

  /* ================= SHOULDERS ================= */
  E("ohp", "Standing Overhead Press", {
    m: { p: ["front_delt"], s: ["triceps", "side_delt", "abs"] },
    eq: "barbell", load: "barbell", range: "heavy", rest: 150, anim: "press_v",
    setup: ["Bar on the front delts, grip just outside the shoulders, elbows slightly in front of the bar."],
    cues: [
      "Squeeze the glutes and brace the abs so your torso is one solid column.",
      "Move your head back out of the way, press straight up.",
      "Once the bar passes your forehead, push your head through the window.",
      "Finish locked out with the biceps by your ears."
    ],
    mist: ["Leaning way back — that is an incline press.", "Pressing around the chin instead of moving the head.", "No glute squeeze, so the lower back takes it."]
  }),
  E("dbohp", "Seated Dumbbell Shoulder Press", {
    m: { p: ["front_delt"], s: ["triceps", "side_delt"] },
    eq: "dumbbell", load: "dumbbell_pair", range: "heavy", rest: 120, anim: "press_v",
    setup: ["Upright bench, back supported, dumbbells at shoulder height."],
    cues: ["Elbows slightly in front of the body, not straight out to the sides.", "Press up and slightly in.", "Lower to ear level for a full stretch."],
    mist: ["Flaring the elbows dead straight out.", "Arching the lower back off the pad.", "Half reps."]
  }),
  E("lat_raise", "Dumbbell Lateral Raise", {
    m: { p: ["side_delt"], s: ["trap"] },
    eq: "dumbbell", load: "dumbbell_pair", range: "pump", rest: 60, anim: "raise_lat",
    setup: ["Stand with a slight forward lean, soft bend in the elbows, dumbbells in front of the thighs."],
    cues: [
      "Lead with the ELBOWS out to the sides, up to shoulder height.",
      "Pinky a touch higher than the thumb at the top, like pouring a jug.",
      "Lower on a slow two-second count — the negative is what builds the delt.",
      "Light weight, strict form. This is not a strength lift."
    ],
    mist: ["Swinging the weights up with momentum.", "Shrugging so the traps steal the work.", "Going so heavy it becomes a partial swing."]
  }),
  E("cable_lat_raise", "Cable Lateral Raise", {
    m: { p: ["side_delt"], s: [] }, eq: "cable", load: "cable", range: "pump", rest: 60, uni: true, anim: "raise_lat",
    setup: ["Low pulley, cable running behind your legs, handle in the far hand."],
    cues: ["Constant tension all the way down — that is why this beats dumbbells.", "Raise to shoulder height, lead with the elbow.", "Slow negative."],
    mist: ["Leaning away to cheat it up.", "Letting the cable pull the arm down fast."]
  }),
  E("fp", "Face Pull", {
    m: { p: ["rear_delt"], s: ["upper_back", "trap"] },
    eq: "cable", load: "cable", range: "pump", rest: 60, anim: "row_h",
    setup: ["Rope attachment set at upper-chest to face height.", "Step back so there is tension at the start."],
    cues: [
      "Pull the rope toward your EYES with the elbows high and wide.",
      "Finish with the knuckles pointing behind you — external rotation.",
      "Hold the end position for a second every rep.",
      "This is shoulder-health money. Never skip it, never go heavy."
    ],
    mist: ["Too heavy, so it turns into a row.", "Elbows dropping below the wrists.", "Leaning back and yanking with bodyweight."]
  }),
  E("rear_fly", "Rear Delt Fly", {
    m: { p: ["rear_delt"], s: ["upper_back"] },
    eq: "dumbbell", load: "dumbbell_pair", range: "pump", rest: 60, anim: "fly",
    setup: ["Hinge forward to about 45°, or lie chest-down on an incline bench."],
    cues: ["Soft fixed elbows, sweep the arms out and back.", "Think about pulling the elbows apart, not lifting the hands.", "Squeeze for a second at the top."],
    mist: ["Using the lower back to swing.", "Turning it into a row by bending the elbows.", "Going too heavy — this is a small muscle."]
  }),
  E("rev_pecdeck", "Reverse Pec Deck", {
    m: { p: ["rear_delt"], s: ["upper_back"] }, eq: "machine", load: "machine_stack", range: "pump", rest: 60, anim: "fly",
    setup: ["Face the pad, chest against it, handles at shoulder height."],
    cues: ["Drive the elbows back and apart.", "Squeeze the rear delts for a second.", "Control the return."],
    mist: ["Shrugging.", "Bouncing off the end range."]
  }),
  E("upright_row", "Cable Upright Row", {
    m: { p: ["side_delt"], s: ["trap", "biceps"] }, eq: "cable", load: "cable", range: "pump", rest: 60, anim: "row_h",
    setup: ["Low pulley with a rope or wide bar."],
    cues: ["Pull to the lower chest with the elbows leading and wide.", "Stop at chest height — going higher pinches the shoulder."],
    mist: ["Pulling to the chin with a narrow grip.", "Using the legs to bounce it up."]
  }),

  /* ================= ARMS ================= */
  E("cur", "EZ-Bar Curl", {
    m: { p: ["biceps"], s: ["forearm"] }, eq: "ezbar", load: "ezbar", range: "pump", rest: 60, anim: "curl",
    setup: ["Grip the inner angles of the EZ bar, arms straight, elbows at your sides."],
    cues: ["Elbows glued to your ribs — they do not travel forward.", "Curl up with control and squeeze hard at the top.", "Lower on a two to three second count to a full stretch."],
    mist: ["Swinging the hips to start the rep.", "Elbows drifting forward so the front delts take over.", "Stopping short of full extension at the bottom."]
  }),
  E("db_curl", "Dumbbell Curl", {
    m: { p: ["biceps"], s: ["forearm"] }, eq: "dumbbell", load: "dumbbell_pair", range: "pump", rest: 60, anim: "curl",
    setup: ["Stand tall, arms hanging, palms forward."],
    cues: ["Curl one or both, elbows pinned.", "Supinate hard — turn the pinky up at the top.", "Full stretch at the bottom."],
    mist: ["Leaning back.", "Half reps at the bottom."]
  }),
  E("ham", "Hammer Curl", {
    m: { p: ["biceps", "forearm"], s: [] }, eq: "dumbbell", load: "dumbbell_pair", range: "pump", rest: 60, anim: "curl",
    setup: ["Neutral grip, palms facing each other."],
    cues: ["Curl up in a slight arc across the body.", "Elbows stay at your sides.", "This builds the brachialis — it is what makes arms look thick."],
    mist: ["Using momentum from the shoulders.", "Wrists curling inward at the top."]
  }),
  E("incline_curl", "Incline Dumbbell Curl", {
    m: { p: ["biceps"], s: ["forearm"] }, eq: "dumbbell", load: "dumbbell_pair", range: "pump", rest: 60, anim: "curl",
    setup: ["Bench at 45-60°, sit back, let the arms hang straight down behind the body."],
    cues: ["The stretch at the bottom is the whole point — do not shorten it.", "Elbows stay behind the torso.", "Squeeze at the top."],
    mist: ["Letting the elbows swing forward.", "Sitting too upright."]
  }),
  E("preacher", "Preacher Curl", {
    m: { p: ["biceps"], s: ["forearm"] }, eq: "ezbar", load: "ezbar", range: "pump", rest: 60, anim: "curl",
    setup: ["Armpits over the top of the pad, upper arms flat against it."],
    cues: ["Lower all the way to nearly straight — controlled.", "Do not let the elbows lift off the pad.", "Squeeze at the top."],
    mist: ["Bouncing out of the bottom (this is where biceps tear).", "Lifting the elbows to cheat."]
  }),
  E("cable_curl", "Cable Curl", {
    m: { p: ["biceps"], s: ["forearm"] }, eq: "cable", load: "cable", range: "pump", rest: 60, anim: "curl",
    setup: ["Low pulley, straight or EZ attachment, stand a step back."],
    cues: ["Constant tension top to bottom.", "Elbows pinned at your sides.", "Slow negative."],
    mist: ["Standing too close so tension dies at the bottom.", "Rocking."]
  }),
  E("tri", "Rope Triceps Pushdown", {
    m: { p: ["triceps"], s: [] }, eq: "cable", load: "cable", range: "pump", rest: 60, anim: "extend",
    setup: ["High pulley with a rope, elbows at your sides, slight forward lean."],
    cues: ["Elbows pinned to your ribs for the entire set.", "Push down and split the rope apart at the bottom.", "Squeeze a full lockout for a second, then control back up."],
    mist: ["Elbows drifting forward so the lats take over.", "Leaning your bodyweight onto the cable.", "Half range at the top."]
  }),
  E("skull", "Skull Crusher", {
    m: { p: ["triceps"], s: [] }, eq: "ezbar", load: "ezbar", range: "pump", rest: 75, anim: "extend",
    setup: ["Lie flat, press the EZ bar up over the chest, then tilt the arms back slightly."],
    cues: ["Only the forearms move — upper arms stay fixed and angled back.", "Lower to the forehead or just behind it for a bigger stretch.", "Extend without letting the elbows flare."],
    mist: ["Turning it into a close-grip press.", "Elbows flaring wide.", "Going heavy enough that the elbows hurt."]
  }),
  E("oh_ext", "Overhead Cable Triceps Extension", {
    m: { p: ["triceps"], s: [] }, eq: "cable", load: "cable", range: "pump", rest: 60, anim: "extend",
    setup: ["Rope on a low-to-mid pulley, face away, rope behind your head, split stance."],
    cues: ["The overhead position gives the long head a real stretch — this is the one that adds size.", "Upper arms stay beside your ears.", "Extend fully and squeeze."],
    mist: ["Elbows flaring out wide.", "Letting the upper arms drop forward."]
  }),
  E("cgbp", "Close-Grip Bench Press", {
    m: { p: ["triceps"], s: ["chest", "front_delt"] }, eq: "barbell", load: "barbell", range: "heavy", rest: 150, anim: "press_h",
    setup: ["Grip about shoulder width — not narrower, that just hurts the wrists."],
    cues: ["Elbows tucked close to the body.", "Lower to the lower chest, press straight up.", "Think about pushing the bar apart."],
    mist: ["Gripping way too narrow.", "Flaring the elbows."]
  }),
  E("dip_tri", "Triceps Dip", {
    m: { p: ["triceps"], s: ["chest", "front_delt"] }, eq: "bodyweight", load: "bodyweight", range: "heavy", rest: 120, anim: "press_h",
    setup: ["Grip the bars and keep the torso as upright as you can."],
    cues: ["Stay vertical — the lean is what shifts it to the chest.", "Elbows straight back.", "Lower to about 90° at the elbow, press to lockout."],
    mist: ["Leaning forward.", "Going too deep and stressing the shoulder."]
  }),
  E("wrist_curl", "Wrist Curl", {
    m: { p: ["forearm"], s: [] }, eq: "dumbbell", load: "dumbbell_pair", range: "pump", rest: 45, anim: "curl",
    setup: ["Forearms on your thighs or a bench, palms up, wrists hanging off the end."],
    cues: ["Let the weight roll to the fingertips, then curl it back up.", "Full range, slow."],
    mist: ["Moving the elbows.", "Tiny partial reps."]
  }),
  E("farmer", "Farmer's Carry", {
    m: { p: ["forearm", "trap"], s: ["abs", "oblique"] }, eq: "dumbbell", load: "dumbbell_pair", range: "pump", rest: 90, anim: "shrug",
    setup: ["Pick up a heavy dumbbell in each hand."],
    cues: ["Stand tall, shoulders back, brace the core.", "Walk with controlled steps. Log reps as seconds carried."],
    mist: ["Leaning to one side.", "Letting the shoulders slump forward."]
  }),

  /* ================= LEGS ================= */
  E("sq", "Barbell Back Squat", {
    m: { p: ["quad", "glute"], s: ["hamstring", "adductor", "lower_back", "abs"] },
    eq: "barbell", load: "barbell", range: "heavy", sets: 4, rest: 210, anim: "squat",
    setup: [
      "Bar on the traps (high bar) or across the rear delts (low bar), squeeze it hard, elbows down.",
      "Feet shoulder width, toes turned out 15-30°.",
      "Unrack, take two steps back, set your stance."
    ],
    cues: [
      "Big breath into the belly, brace like you are about to take a punch.",
      "Sit down between your heels, not back like a hinge.",
      "Knees track out over the toes — push them out on the way down.",
      "Hit parallel or just below, then drive the floor away."
    ],
    mist: [
      "Heels lifting and the weight rolling onto the toes.",
      "Knees caving inward on the way up.",
      "Cutting depth as the weight gets heavy.",
      "Losing the brace so the chest collapses forward."
    ]
  }),
  E("front_sq", "Front Squat", {
    m: { p: ["quad"], s: ["glute", "abs", "upper_back"] },
    eq: "barbell", load: "barbell", range: "heavy", rest: 180, anim: "squat",
    setup: ["Bar racked on the front delts, elbows driven high, fingers just under the bar."],
    cues: ["Elbows UP the whole set — if they drop, you drop the bar.", "Stay upright, sit straight down.", "Brace hard."],
    mist: ["Elbows falling.", "Letting the torso pitch forward."]
  }),
  E("lpz", "Leg Press", {
    m: { p: ["quad", "glute"], s: ["hamstring", "adductor"] },
    eq: "machine", load: "plate_machine", range: "heavy", sets: 4, rest: 150, anim: "squat",
    setup: ["Feet mid-platform, shoulder width, toes slightly out.", "Back and hips flat against the pad."],
    cues: ["Lower until the knees reach about 90°, or as deep as your lower back stays flat.", "Push through the whole foot.", "Stop just short of locking the knees at the top."],
    mist: ["Going so deep the hips roll off the pad.", "Ego-loading half reps.", "Knees caving inward.", "Slamming into lockout."]
  }),
  E("hack", "Hack Squat", {
    m: { p: ["quad"], s: ["glute"] }, eq: "machine", load: "plate_machine", range: "heavy", rest: 150, anim: "squat",
    setup: ["Shoulders under the pads, feet mid-platform."],
    cues: ["Sit down deep, back flat on the pad.", "Drive through the mid-foot.", "Controlled on the way down."],
    mist: ["Bouncing at the bottom.", "Heels lifting."]
  }),
  E("bss", "Bulgarian Split Squat", {
    m: { p: ["quad", "glute"], s: ["hamstring", "adductor"] },
    eq: "dumbbell", load: "dumbbell_pair", range: "heavy", rest: 90, uni: true, anim: "lunge",
    setup: ["Rear foot up on a bench, front foot far enough forward that the front shin stays near vertical."],
    cues: ["Drop straight down — rear knee toward the floor.", "Drive through the front heel.", "All reps on one leg, then switch. Log the weight per hand."],
    mist: ["Front foot too close, so the knee travels miles forward.", "Bouncing at the bottom.", "Pushing off the back leg."]
  }),
  E("lunge", "Walking Lunge", {
    m: { p: ["quad", "glute"], s: ["hamstring", "adductor"] },
    eq: "dumbbell", load: "dumbbell_pair", range: "pump", rest: 90, uni: true, anim: "lunge",
    setup: ["Dumbbells at your sides, stand tall."],
    cues: ["Long step, drop the back knee toward the floor.", "Torso upright, drive through the front heel.", "Count reps per leg."],
    mist: ["Short choppy steps.", "Leaning forward over the front knee."]
  }),
  E("rdl", "Romanian Deadlift", {
    m: { p: ["hamstring", "glute"], s: ["lower_back", "forearm"] },
    eq: "barbell", load: "barbell", range: "heavy", rest: 150, anim: "hinge",
    setup: ["Stand with the bar at the hips, soft knees, feet hip width."],
    cues: [
      "Push the hips straight BACK, not down — the knees barely move.",
      "Bar slides down the thighs, staying in contact.",
      "Feel the hamstring stretch around mid-shin, then drive the hips forward.",
      "Squeeze the glutes at the top; do not lean back."
    ],
    mist: ["Bending the knees too much and turning it into a squat.", "Rounding the lower back.", "Letting the bar drift away from the legs."]
  }),
  E("db_rdl", "Dumbbell Romanian Deadlift", {
    m: { p: ["hamstring", "glute"], s: ["lower_back"] },
    eq: "dumbbell", load: "dumbbell_pair", range: "heavy", rest: 120, anim: "hinge",
    setup: ["A dumbbell in each hand in front of the thighs, soft knees."],
    cues: ["Hips back, dumbbells tracking down the legs.", "Flat back, stretch the hamstrings.", "Squeeze the glutes to stand up."],
    mist: ["Squatting instead of hinging.", "Rounding the back."]
  }),
  E("leg_curl", "Lying Leg Curl", {
    m: { p: ["hamstring"], s: ["calf"] }, eq: "machine", load: "machine_stack", range: "pump", rest: 60, anim: "curl_leg",
    setup: ["Pad just above the heels, hips flat on the bench."],
    cues: ["Curl all the way up and squeeze for a second.", "Lower slowly to a full stretch.", "Keep the hips down — no bridging."],
    mist: ["Lifting the hips to swing the weight.", "Half reps.", "Dropping the weight fast."]
  }),
  E("seated_curl", "Seated Leg Curl", {
    m: { p: ["hamstring"], s: [] }, eq: "machine", load: "machine_stack", range: "pump", rest: 60, anim: "curl_leg",
    setup: ["Thigh pad locked down, knees in line with the machine's pivot."],
    cues: ["The hip-flexed position stretches the hamstrings more than lying — great for growth.", "Full curl, slow return."],
    mist: ["Sliding forward in the seat.", "Partial reps."]
  }),
  E("leg_ext", "Leg Extension", {
    m: { p: ["quad"], s: [] }, eq: "machine", load: "machine_stack", range: "pump", rest: 60, anim: "extend_leg",
    setup: ["Knees in line with the pivot, pad on the lower shin."],
    cues: ["Extend to a full lockout and squeeze for a second.", "Lower under control.", "Point the toes up."],
    mist: ["Swinging the weight up with momentum.", "Slamming the stack down.", "Half reps from the bottom."]
  }),
  E("hip_thrust", "Barbell Hip Thrust", {
    m: { p: ["glute"], s: ["hamstring", "quad"] },
    eq: "barbell", load: "barbell", range: "heavy", rest: 120, anim: "hinge",
    setup: ["Upper back on a bench, bar over the hips with a pad, feet flat and shin vertical at the top."],
    cues: ["Tuck the chin, ribs down.", "Drive through the heels and squeeze the glutes HARD at the top.", "Full lockout, one-second hold, then lower under control."],
    mist: ["Hyperextending the lower back instead of squeezing the glutes.", "Feet too far forward, so the hamstrings take over.", "Bouncing off the floor."]
  }),
  E("glute_bridge", "Glute Bridge", {
    m: { p: ["glute"], s: ["hamstring"] }, eq: "bodyweight", load: "bodyweight", range: "pump", rest: 60, anim: "hinge",
    setup: ["Lie on your back, knees bent, feet flat and close to the hips."],
    cues: ["Push through the heels, squeeze the glutes to lift.", "Ribs down, do not arch the back.", "Pause at the top."],
    mist: ["Arching the lower back.", "Rushing the reps."]
  }),
  E("calf", "Standing Calf Raise", {
    m: { p: ["calf"], s: [] }, eq: "machine", load: "machine_stack", range: "pump", sets: 4, rest: 60, anim: "calf",
    setup: ["Balls of the feet on the platform, heels hanging free, legs straight."],
    cues: ["Full stretch at the bottom — pause there for a second.", "Press up to a full tiptoe and squeeze for one to two seconds.", "Slow lowering. Calves grow from range, not bouncing."],
    mist: ["Bouncing out of the stretch reflex.", "Fast partial reps.", "Bending the knees to cheat the weight up."]
  }),
  E("seated_calf", "Seated Calf Raise", {
    m: { p: ["calf"], s: [] }, eq: "machine", load: "plate_machine", range: "pump", rest: 60, anim: "calf",
    setup: ["Pad on the lower thighs, balls of the feet on the platform."],
    cues: ["The bent knee targets the soleus — the muscle under the visible calf.", "Full stretch, full squeeze, slow."],
    mist: ["Bouncing.", "Short range."]
  }),
  E("adductor_m", "Hip Adduction Machine", {
    m: { p: ["adductor"], s: ["glute"] }, eq: "machine", load: "machine_stack", range: "pump", rest: 60, anim: "fly",
    setup: ["Sit tall, pads on the inner thighs."],
    cues: ["Squeeze the legs together, pause, open slowly to a stretch."],
    mist: ["Slamming the pads together.", "Cutting the stretch short."]
  }),
  E("abduction", "Hip Abduction Machine", {
    m: { p: ["glute"], s: [] }, eq: "machine", load: "machine_stack", range: "pump", rest: 60, anim: "fly",
    setup: ["Sit tall, pads on the outer thighs, slight forward lean hits the glutes harder."],
    cues: ["Push out and hold for a second.", "Slow return."],
    mist: ["Bouncing the stack.", "Leaning back."]
  }),

  /* ================= CORE ================= */
  E("abs", "Cable Crunch", {
    m: { p: ["abs"], s: ["oblique"] }, eq: "cable", load: "cable", range: "pump", rest: 60, anim: "crunch",
    setup: ["Kneel below a high pulley, rope beside your head, hips fixed."],
    cues: ["Crunch the ribs DOWN toward the pelvis — bend the spine, not the hips.", "Exhale hard at the bottom.", "Control the way back up."],
    mist: ["Pulling with the arms.", "Hinging at the hips instead of flexing the abs.", "Rushing — this one is all about the squeeze."]
  }),
  E("hang_raise", "Hanging Leg Raise", {
    m: { p: ["abs"], s: ["oblique", "forearm"] }, eq: "bodyweight", load: "bodyweight", range: "pump", rest: 60, anim: "crunch",
    setup: ["Hang from the bar, shoulders pulled down."],
    cues: ["Curl the pelvis up toward the ribs — do not just lift the legs.", "No swinging; pause at the top.", "Lower slowly."],
    mist: ["Swinging back and forth.", "Only lifting the legs with the hip flexors."]
  }),
  E("plank", "Plank", {
    m: { p: ["abs"], s: ["oblique"] }, eq: "bodyweight", load: "bodyweight", range: "pump", rest: 45, anim: "plank",
    setup: ["Elbows under the shoulders, body in one straight line."],
    cues: ["Squeeze the glutes and brace the abs hard.", "Ribs down, do not let the hips sag. Log reps as seconds."],
    mist: ["Hips sagging or piking up.", "Holding your breath."]
  }),
  E("side_plank", "Side Plank", {
    m: { p: ["oblique"], s: ["abs"] }, eq: "bodyweight", load: "bodyweight", range: "pump", rest: 45, uni: true, anim: "plank",
    setup: ["On your side, elbow under the shoulder, feet stacked."],
    cues: ["Lift the hips high and hold a straight line. Log reps as seconds per side."],
    mist: ["Hips dropping.", "Rolling forward."]
  }),
  E("woodchop", "Cable Woodchop", {
    m: { p: ["oblique"], s: ["abs"] }, eq: "cable", load: "cable", range: "pump", rest: 60, uni: true, anim: "row_h",
    setup: ["High pulley, handle in both hands, stand side-on."],
    cues: ["Rotate from the ribs, arms stay fairly straight.", "Pivot the back foot, control the return."],
    mist: ["Pulling with the arms only.", "Twisting from the lower back."]
  }),
  E("back_ext", "Back Extension", {
    m: { p: ["lower_back"], s: ["glute", "hamstring"] }, eq: "bodyweight", load: "bodyweight", range: "pump", rest: 60, anim: "hinge",
    setup: ["Hips on the pad, feet locked in."],
    cues: ["Hinge down with a flat back, squeeze the glutes to come up.", "Stop level with the body — do not hyperextend."],
    mist: ["Arching hard at the top.", "Bouncing at the bottom."]
  }),
  E("ab_wheel", "Ab Wheel Rollout", {
    m: { p: ["abs"], s: ["oblique", "lat"] }, eq: "bodyweight", load: "bodyweight", range: "pump", rest: 60, anim: "plank",
    setup: ["Kneel with the wheel under the shoulders."],
    cues: ["Ribs down and glutes squeezed before you move.", "Roll out only as far as you can hold the back flat.", "Pull back with the abs, not the hips."],
    mist: ["Letting the lower back arch.", "Going further than you can control."]
  })
];

export const BY_ID = Object.fromEntries(EXERCISES.map(e => [e.id, e]));

export const EQUIPMENT = ["barbell", "dumbbell", "cable", "machine", "bodyweight", "ezbar", "smith"];

export function allExercises(state) {
  const custom = (state && state.customExercises) || [];
  return EXERCISES.concat(custom);
}

export function findEx(state, id) {
  return BY_ID[id] || ((state && state.customExercises) || []).find(e => e.id === id) || null;
}

/** Alternatives that hit the same primary muscle, for the in-workout swap. */
export function alternativesFor(state, id, opts = {}) {
  const ex = findEx(state, id);
  if (!ex) return [];
  const wantEq = opts.equipment && opts.equipment.length ? new Set(opts.equipment) : null;
  return allExercises(state)
    .filter(e => e.id !== id)
    .map(e => {
      const shared = e.m.p.filter(m => ex.m.p.includes(m)).length;
      const secondary = e.m.p.filter(m => (ex.m.s || []).includes(m)).length;
      return { e, score: shared * 10 + secondary * 3 + (e.range === ex.range ? 2 : 0) };
    })
    .filter(x => x.score >= 10 && (!wantEq || wantEq.has(x.e.eq)))
    .sort((a, b) => b.score - a.score)
    .map(x => x.e);
}
