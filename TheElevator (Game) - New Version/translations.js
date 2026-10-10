/* Translations. One 'key: text' per line. To add a language, copy the `en` block,
   translate it, and add an <option> for it in index.html (id="selLang") and in
   SPEECH_LANG (js/audio.js). Missing keys fall back to English. */
const parseLines = block => Object.fromEntries(block.trim().split('\n').map(line => {
  const i = line.indexOf(':');
  return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
}));

const TEXT = {
en: parseLines(`
play: Play
resume: Resume
again: Play again
ctl: Controls
set: Settings
home: Main menu
back: Back
gfx: Graphics
vol: Volume
sens: Mouse sensitivity
lang: Language
voice: Voice (text to speech)
vOn: On
vOff: Off
q1: Retro 240p
q2: Retro 360p
q3: Retro 480p
q4: Sharp
ttl: THE<br>ELEVATOR
sub: Five floors. Five keys. One way out.
pttl: PAUSED
psub: The elevator waits.
ettl: YOU<br>ESCAPED
esub: All five keys. The elevator lets you go.
hint: Best played in the dark with headphones.
cm: Walk
cr: Run
cj: Jump
cl: Look around (drag if the mouse will not lock)
cc: Elevator buttons, talk
cf: Flashlight
cp: Pause
n0: Lobby
n1: The Field
n2: The Lava Room
n3: The House
n4: The Office
n5: The Obby
fl: Floor
o0: Take the elevator. Step inside and press button 1.
o1: Find the floating key somewhere in the field.
o2: The floor is lava. Hop across the furniture to the key.
o3: Find the key inside the haunted house. Do not let it catch you.
o4: This is not your office. Find the real key and leave.
o5: Reach the key at the end. Do not fall in the water.
oback: You have the key. Return to the elevator and press the next floor.
here: You are already on this floor.
lk: Locked: find the key on the previous floor.
dead: The button does not respond.
go: click or E
talk: Talk to
pe: Press E
lobSub: The elevator is at the back of the room.
cpt: Checkpoint reached.
you: You
m1: Welcome to Fathom Tower. The elevator is at the back. Take floor one.
m2: Five floors hide five keys. Bring them all back and I will open the door.
m3: Back already? Keep going. And do not trust everything you see.
m4: You found them all. The door is yours.
e_go: Doors closing.
e_lock: Access denied. Find the key first.
e_dead: Error. Elevator offline.
e_win: Exit unlocked. Goodbye.
e_f0: Lobby.
e_f1: Floor one. Fresh air.
e_f2: Floor two. Please do not touch the floor.
e_f3: Floor three. I advise against this.
e_f4: Floor four. Lobby.
e_f5: Floor five. Mind the water.
s1: Psst. The key glows out west, past the rocks.
s2: Nice day. Do not stay past dark.
c1: Hot, hot, hot! Hop on the furniture!
c2: The key sits on the big dresser. Do not look down.
w1: You should not be here.
w2: Stay with me.
w3: GET OUT.
fm1: Welcome back. You never left.
fm2: The elevator works fine. Why leave?
fm3: Take any key you like.
fm4: Wrong key.
b1: Easy jumps! You got this.
b2: Fell in? Just try again.
y_k1: A floating key. Sure, why not.
y_k2: Hot key. Literally.
y_k3: Got it. Now get out of here.
y_k4: That one felt wrong.
y_k5: The last one. I can go home.
y_f2: The floor is lava. Great.
y_f3: It is so dark in here...
y_f4: Wait. This is the lobby... right?
y_scare: Run!
y_burn: Ow! Hot!
y_splash: Cold!
y_btn: Something slid open.
`),
fil: parseLines(`
play: Maglaro
resume: Ituloy
again: Maglaro ulit
ctl: Mga Kontrol
set: Mga Setting
home: Pangunahing menu
back: Bumalik
gfx: Graphics
vol: Lakas ng tunog
sens: Sensitivity ng mouse
lang: Wika
voice: Boses (text to speech)
vOn: Bukas
vOff: Sarado
q4: Malinaw
ttl: ANG<br>ELEVATOR
sub: Limang palapag. Limang susi. Isang labasan.
pttl: NAKA-PAUSE
psub: Naghihintay ang elevator.
ettl: NAKATAKAS<br>KA
esub: Lahat ng limang susi. Pinalaya ka ng elevator.
hint: Mas nakakatakot sa dilim, gamit ang headphones.
cm: Maglakad
cr: Tumakbo
cj: Tumalon
cl: Tumingin (i-drag kung hindi mag-lock ang mouse)
cc: Mga button ng elevator, makipag-usap
cf: Flashlight
cp: I-pause
n0: Lobby
n1: Ang Bukid
n2: Ang Lava Room
n3: Ang Bahay
n4: Ang Opisina
n5: Ang Obby
fl: Palapag
o0: Sumakay sa elevator. Pumasok at pindutin ang 1.
o1: Hanapin ang lumulutang na susi sa bukid.
o2: Lava ang sahig. Lundagan ang mga muwebles papunta sa susi.
o3: Hanapin ang susi sa loob ng haunted na bahay. Huwag kang mahuli.
o4: Hindi ito ang opisina mo. Hanapin ang tunay na susi at umalis.
o5: Abutin ang susi sa dulo. Huwag mahulog sa tubig.
oback: Nasa iyo na ang susi. Bumalik sa elevator at pindutin ang susunod na palapag.
here: Nandito ka na sa palapag na ito.
lk: Naka-lock: hanapin ang susi sa naunang palapag.
dead: Hindi tumutugon ang button.
go: i-click o E
talk: Kausapin si
pe: Pindutin ang E
lobSub: Nasa likod ng silid ang elevator.
cpt: Naabot ang checkpoint.
you: Ikaw
m1: Maligayang pagdating sa Fathom Tower. Nasa likod ang elevator. Sumakay sa unang palapag.
m2: Limang palapag, limang susi. Dalhin silang lahat at bubuksan ko ang pinto.
m3: Bumalik ka agad? Magpatuloy ka. At huwag basta maniwala sa nakikita mo.
m4: Nahanap mo silang lahat. Sa iyo na ang pinto.
e_go: Nagsasara ang mga pinto.
e_lock: Tinanggihan. Hanapin muna ang susi.
e_dead: Error. Offline ang elevator.
e_win: Bukas na ang labasan. Paalam.
e_f0: Lobby.
e_f1: Unang palapag. Sariwang hangin.
e_f2: Ikalawang palapag. Huwag hawakan ang sahig.
e_f3: Ikatlong palapag. Hindi ko ito inirerekomenda.
e_f4: Ikaapat na palapag. Lobby.
e_f5: Ikalimang palapag. Mag-ingat sa tubig.
s1: Psst. Kumikinang ang susi sa kanluran, lampas sa mga bato.
s2: Magandang araw. Huwag magpagabi dito.
c1: Mainit, mainit, mainit! Tumalon sa mga muwebles!
c2: Nasa malaking aparador ang susi. Huwag kang tumingin sa ibaba.
w1: Hindi ka dapat nandito.
w2: Samahan mo ako.
w3: LUMAYAS KA.
fm1: Welcome back. Hindi ka naman umalis.
fm2: Gumagana naman ang elevator. Bakit aalis?
fm3: Kunin mo ang kahit anong susi.
fm4: Maling susi.
b1: Madaling talon lang! Kaya mo yan.
b2: Nahulog ka? Ulitin mo lang.
y_k1: Lumulutang na susi. Sige na nga.
y_k2: Mainit na susi. Literal.
y_k3: Nakuha ko. Alis na dito.
y_k4: Iba ang pakiramdam niyan.
y_k5: Huling susi na. Makakauwi na ako.
y_f2: Lava ang sahig. Ang saya.
y_f3: Ang dilim dito...
y_f4: Teka. Ito yung lobby... tama?
y_scare: Takbo!
y_burn: Aray! Mainit!
y_splash: Ang lamig!
y_btn: May bumukas na pader.
`),
es: parseLines(`
play: Jugar
resume: Continuar
again: Jugar de nuevo
ctl: Controles
set: Ajustes
home: Menú principal
back: Volver
gfx: Gráficos
vol: Volumen
sens: Sensibilidad del ratón
lang: Idioma
voice: Voz (texto a voz)
vOn: Sí
vOff: No
q4: Nítido
ttl: EL<br>ASCENSOR
sub: Cinco pisos. Cinco llaves. Una salida.
pttl: PAUSA
psub: El ascensor espera.
ettl: HAS<br>ESCAPADO
esub: Las cinco llaves. El ascensor te deja ir.
hint: Mejor jugar a oscuras y con auriculares.
cm: Caminar
cr: Correr
cj: Saltar
cl: Mirar (arrastra si el ratón no se bloquea)
cc: Botones del ascensor, hablar
cf: Linterna
cp: Pausa
n0: Vestíbulo
n1: El Campo
n2: La Sala de Lava
n3: La Casa
n4: La Oficina
n5: El Obby
fl: Piso
o0: Toma el ascensor. Entra y pulsa el botón 1.
o1: Encuentra la llave flotante en el campo.
o2: El suelo es lava. Salta por los muebles hasta la llave.
o3: Encuentra la llave en la casa encantada. Que no te atrape.
o4: Esta no es tu oficina. Encuentra la llave real y sal.
o5: Llega a la llave del final. No caigas al agua.
oback: Tienes la llave. Vuelve al ascensor y pulsa el siguiente piso.
here: Ya estás en este piso.
lk: Bloqueado: busca la llave del piso anterior.
dead: El botón no responde.
go: clic o E
talk: Hablar con
pe: Pulsa E
lobSub: El ascensor está al fondo de la sala.
cpt: Punto de control alcanzado.
you: Tú
m1: Bienvenido a la Torre Fathom. El ascensor está al fondo. Ve al piso uno.
m2: Cinco pisos esconden cinco llaves. Tráelas todas y abriré la puerta.
m3: ¿Ya de vuelta? Sigue. Y no te fíes de todo lo que ves.
m4: Las encontraste todas. La puerta es tuya.
e_go: Cerrando puertas.
e_lock: Acceso denegado. Encuentra la llave primero.
e_dead: Error. Ascensor fuera de servicio.
e_win: Salida desbloqueada. Adiós.
e_f0: Vestíbulo.
e_f1: Piso uno. Aire fresco.
e_f2: Piso dos. Por favor, no toque el suelo.
e_f3: Piso tres. No se lo recomiendo.
e_f4: Piso cuatro. Vestíbulo.
e_f5: Piso cinco. Cuidado con el agua.
s1: Psst. La llave brilla al oeste, pasadas las rocas.
s2: Buen día. No te quedes al anochecer.
c1: ¡Quema, quema! ¡Salta por los muebles!
c2: La llave está en la cómoda grande. No mires abajo.
w1: No deberías estar aquí.
w2: Quédate conmigo.
w3: FUERA.
fm1: Bienvenido de nuevo. Nunca te fuiste.
fm2: El ascensor funciona bien. ¿Para qué irte?
fm3: Coge la llave que quieras.
fm4: Llave equivocada.
b1: ¡Saltos fáciles! Tú puedes.
b2: ¿Caíste? Inténtalo otra vez.
y_k1: Una llave flotante. Bueno, ¿por qué no?
y_k2: Llave caliente. Literalmente.
y_k3: La tengo. Ahora, a salir de aquí.
y_k4: Esa se sintió mal.
y_k5: La última. Puedo volver a casa.
y_f2: El suelo es lava. Genial.
y_f3: Qué oscuro está aquí...
y_f4: Espera. Este es el vestíbulo... ¿verdad?
y_scare: ¡Corre!
y_burn: ¡Ay! ¡Quema!
y_splash: ¡Fría!
y_btn: Algo se abrió.
`),
ja: parseLines(`
play: プレイ
resume: 再開
again: もう一度
ctl: 操作
set: 設定
home: メインメニュー
back: 戻る
gfx: グラフィック
vol: 音量
sens: マウス感度
lang: 言語
voice: 音声（読み上げ）
vOn: オン
vOff: オフ
q4: 高画質
ttl: エレベーター
sub: 5つのフロア。5つの鍵。出口はひとつ。
pttl: 一時停止
psub: エレベーターが待っている。
ettl: 脱出<br>成功
esub: 5つの鍵がそろった。エレベーターが道を開く。
hint: 暗い部屋でヘッドホン推奨。
cm: 歩く
cr: 走る
cj: ジャンプ
cl: 見回す（ロックできない時はドラッグ）
cc: エレベーターのボタン・会話
cf: 懐中電灯
cp: 一時停止
n0: ロビー
n1: 野原
n2: 溶岩の部屋
n3: 屋敷
n4: オフィス
n5: アスレチック
fl: 階
o0: エレベーターに乗り、1のボタンを押そう。
o1: 野原のどこかに浮かぶ鍵を探そう。
o2: 床は溶岩。家具を飛び移って鍵へ向かおう。
o3: 幽霊屋敷の中で鍵を探そう。捕まるな。
o4: ここは君のオフィスじゃない。本物の鍵を見つけて出よう。
o5: 奥の鍵まで進もう。水に落ちるな。
oback: 鍵を手に入れた。エレベーターに戻って次の階を押そう。
here: もうこの階にいる。
lk: ロック中：前の階の鍵を探そう。
dead: ボタンが反応しない。
go: クリックまたはE
talk: 話す：
pe: Eを押す
lobSub: エレベーターは部屋の奥にある。
cpt: チェックポイント到達。
you: あなた
m1: ファゾム・タワーへようこそ。エレベーターは奥です。まず1階へ。
m2: 5つの階に5つの鍵があります。全部持ってきたら、扉を開けます。
m3: もう戻ったの？先へ進んで。見えるものを全部信じちゃだめ。
m4: 全部見つけたのね。扉はあなたのもの。
e_go: ドアが閉まります。
e_lock: アクセス拒否。先に鍵を探してください。
e_dead: エラー。エレベーターは停止中。
e_win: 出口が開きました。さようなら。
e_f0: ロビーです。
e_f1: 1階です。新鮮な空気です。
e_f2: 2階です。床には触れないでください。
e_f3: 3階です。おすすめしません。
e_f4: 4階です。ロビーです。
e_f5: 5階です。水にご注意ください。
s1: ひそひそ…鍵は西の岩の向こうで光ってるよ。
s2: いい天気だね。暗くなる前に帰りな。
c1: あちち！家具の上を跳んで！
c2: 鍵は大きなタンスの上。下は見ちゃだめ。
w1: ここにいてはいけない。
w2: そばにいて。
w3: 出ていけ。
fm1: おかえり。あなたは出ていってないわ。
fm2: エレベーターは正常よ。どうして出るの？
fm3: 好きな鍵を取っていいのよ。
fm4: その鍵は違う。
b1: 簡単なジャンプだよ！いけるいける。
b2: 落ちた？もう一回やってみよう。
y_k1: 浮かぶ鍵か。まあ、いいか。
y_k2: 熱い鍵だ。文字通りに。
y_k3: 取った。早くここを出よう。
y_k4: あれは嫌な感じがした。
y_k5: 最後の鍵だ。家に帰れる。
y_f2: 床が溶岩。最高だね。
y_f3: ここ、すごく暗い…
y_f4: 待って。ここはロビー…だよね？
y_scare: 走れ！
y_burn: あつっ！
y_splash: 冷たい！
y_btn: 何かが開いた。
`)
};