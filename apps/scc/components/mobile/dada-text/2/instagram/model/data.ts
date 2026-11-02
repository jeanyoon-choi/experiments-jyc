export type Account = { id: string; name: string; fullName: string; avatar: string; bio: string; location: string; followers: string; following: string };
export type Comment = { id: string; author: string; body: string };
export type Post = { id: string; accountId: string; image: string; alt: string; caption: string; location: string; likes: number; age: string; comments: Comment[]; reel?: boolean; video?: string; own?: boolean };

const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=82`;

// Every row has a different source photograph and an individually written caption.
// The descriptions follow the source images' public alt metadata, not crop variants.
const entries: [string, string, string, string, string][] = [
  ['street','photo-1546636889-ba9fdd63583e','The Chrysler Building above a wet New York street','Rain made the Chrysler Building look like it was floating above the avenue.','New York'],
  ['street','photo-1628803184377-c5167a0cb6fd','Wooden tables outside a shop at night','The chairs were still outside after everyone went home.','New York'],
  ['street','photo-1620259570543-31964aa22586','Person in a black hoodie walking down a street','One figure found the only patch of afternoon light.','London'],
  ['street','photo-1598966835412-6de6f92c243d','Narrow alley between white buildings with SLOW painted on the road','SLOW is painted on the road; the alley takes it seriously.','Lisbon'],
  ['street','photo-1429292394373-ddbcc6bb7468','Black and white photograph of a woman crossing a road','A crossing, a glance, and a frame I nearly missed.','Paris'],
  ['street','photo-1599557041284-7e2a15610388','Red telephone box beside a pale building','The last red telephone box on this walk.','London'],
  ['street','photo-1534847004764-b93737310da1','People moving through a city street at night','After dark the pavement becomes its own little stage.','Tokyo'],
  ['street','photo-1570587726545-494e2bcc2f9f','Cyclist riding through a street','A cyclist cut across my viewfinder at exactly the right moment.','Copenhagen'],
  ['street','photo-1607622017669-2b0fe5eb878b','Brown city bicycle leaning against a wooden door','The bike and the door belong to the same shade of brown.','Amsterdam'],
  ['street','photo-1487452066049-a710f7296400','Empty tunnel with graffiti along the walls','The quietest tunnel in the loudest part of town.','Berlin'],
  ['interior','photo-1618221195710-dd6b41faaea6','White and brown living room','A room arranged for the hour before guests arrive.','Seoul'],
  ['interior','photo-1618220179428-22790b461013','Green plant in a white ceramic pot','The plant has claimed the best light in the apartment.','Seoul'],
  ['interior','photo-1586023492125-27b2c045efd7','Yellow padded chair in a wooden frame','I came for the exhibition and stayed for this chair.','Copenhagen'],
  ['interior','photo-1606744837616-56c9a5c6a6eb','Green armchair and yellow pillow near stone stairs','A small argument between olive green and mustard yellow.','Stockholm'],
  ['interior','photo-1664711942326-2c3351e215e6','Sofa and table in a living room','A table low enough to slow the whole room down.','Paris'],
  ['interior','photo-1616046229478-9901c5536a45','Wooden dining table and chairs','Six chairs, one empty afternoon.','Seoul'],
  ['interior','photo-1583847268964-b28dc8f51f92','Furnished room with a large window','The window is doing half the decorating.','London'],
  ['interior','photo-1564078516393-cf04bd966897','Grey chaise beside a window','The corner where every book gets finished.','Copenhagen'],
  ['interior','photo-1606744824163-985d376605aa','Grey armchair in a dark green room','A soft grey chair against a room that feels like a forest.','Stockholm'],
  ['interior','photo-1618219908412-a29a1bb7b86e','Black chair beside a rattan cabinet and plants','I like a room that leaves space around its objects.','Seoul'],
  ['flowers','photo-1582794543139-8ac9cb0f7b11','Close view of pink roses','Roses, two days after opening.','Seoul'],
  ['flowers','photo-1490750967868-88aa4486c946','Orange flowers in soft light','These orange stems were the entire reason for the morning market trip.','Seoul'],
  ['flowers','photo-1613539246066-78db6ec4ff0f','Blue and white flowers on a light background','Blue among the white; the arrangement needed nothing else.','Paris'],
  ['flowers','photo-1615280825886-fa817c0a06cc','White cherry blossoms seen close up','The blossoms were already falling while I photographed them.','Seoul'],
  ['flowers','photo-1471899236350-e3016bf1e69e','Pink flower isolated against a soft background','Just one stem, and all that space around it.','London'],
  ['flowers','photo-1602615576820-ea14cf3e476a','Pink and white flowers beneath a pale sky','A cloudy sky turned this patch of flowers into pastels.','Kyoto'],
  ['flowers','photo-1538998073820-4dfa76300194','Pink and white lotus flower','The lotus opened slowly enough to make me wait.','Tokyo'],
  ['flowers','photo-1508808703020-ef18109db02f','Clusters of white and pink blossoms','There were too many blossoms to choose a single one.','Paris'],
  ['flowers','photo-1525310072745-f49212b5ac6d','Pink flower in close view','All the detail sits at the edge of a petal.','Seoul'],
  ['flowers','photo-1541275055241-329bbdf9a191','Purple flower in close view','The purple went darker each time the cloud passed.','Copenhagen'],
  ['cafe','photo-1556742393-d75f468bfcb0','Barista working behind a wooden counter','The person behind the counter remembers every regular order.','Seoul'],
  ['cafe','photo-1569096651661-820d0de8b4ab','Tables on a patio by an open storefront','Outside seats before the lunch crowd arrives.','Lisbon'],
  ['cafe','photo-1559925393-8be0ec4767c8','Outdoor cafe on a cobbled street','We chose the table nearest the street and stayed all afternoon.','Paris'],
  ['cafe','photo-1555396273-367ea4eb4db5','Rustic cafe with wooden tables','The timber tables carry a thousand cup marks.','Copenhagen'],
  ['cafe','photo-1556742400-b5b7c5121f99','White ceramic coffee cup','A cup that was still warm when the rain began.','London'],
  ['cafe','photo-1616091216791-a5360b5fc78a','Dining room lit by strings of lights','Dinner under lights that made the whole room softer.','Seoul'],
  ['cafe','photo-1551610290-e153ec567dd8','Roasted coffee beans','The smell of the beans reached the pavement first.','Melbourne'],
  ['cafe','photo-1621135177072-57c9b6242e7a','White cup and saucer on a wooden table','The only thing on the table was a second coffee.','Paris'],
  ['cafe','photo-1592663527359-cf6642f54cff','Cream being poured into iced coffee','One pour changed the color of the whole glass.','Seoul'],
  ['cafe','photo-1523368749929-6b2bf370dbf8','Blue and white cafe storefront','A blue storefront I kept walking past until today.','Amsterdam'],
  ['books','photo-1610116306796-6fea9f4fae38','Stack of open paperback books','Three books open, none of them at the same page.','Seoul'],
  ['books','photo-1694730750153-8b66cf3dd014','Open books piled on a table','The table disappeared under the reading list.','London'],
  ['books','photo-1604866830893-c13cafa515d5','Books along a wooden shelf','A shelf organized by memory rather than alphabet.','Seoul'],
  ['books','photo-1680973543493-6c03e66402fe','Pile of books balanced on a wall','Someone left a little tower of stories behind.','Paris'],
  ['books','photo-1457369804613-52c61a468e7d','Open books arranged together','Every open page seems to start a different conversation.','Copenhagen'],
  ['books','photo-1541963463532-d68292c34b19','Person reading an open book in mountain scenery','Reading outside made me look up after every paragraph.','Lake District'],
  ['books','photo-1524995997946-a1c2e315a42f','Shelves filled with books','The aisle where I always lose track of time.','New York'],
  ['books','photo-1495446815901-a7297e633e8d','Books spread across a table','A Sunday with more bookmarks than plans.','Seoul'],
  ['books','photo-1550399105-c4db5fb85c18','Assorted books grouped together','The covers alone sent me home with three more.','London'],
  ['books','photo-1535905557558-afc4877a26fc','Ladder against tall antique library shelves','I wanted to climb this ladder just to see the top shelf.','Dublin'],
  ['architecture','photo-1479839672679-a46483c0e7c8','White modern building under blue sky','A white wall that needed the whole blue sky.','Tokyo'],
  ['architecture','photo-1527576539890-dfa815648363','Curving facade of Axel Towers','Axel Towers looks different after each turn around the block.','Copenhagen'],
  ['architecture','photo-1548248823-ce16a73b6d49','Curved building against blue sky','A curve pulled the building out of a straight street.','Berlin'],
  ['architecture','photo-1486718448742-163732cd1544','Undulating brown architectural surface','Stone moving like a line drawn without lifting the pen.','Seoul'],
  ['architecture','photo-1551038247-3d9af20df552','Tiled modern building with orange window details','The orange windows keep interrupting the grid.','Rotterdam'],
  ['architecture','photo-1554469384-e58fac16e23a','Tall building seen from below','Standing this close made the top disappear.','New York'],
  ['architecture','photo-1531591022136-eb8b0da1e6d0','Curved metal panels of Walt Disney Concert Hall','The concert hall catches a different sky in every panel.','Los Angeles'],
  ['architecture','photo-1518005020951-eccb494ad742','White concrete building in daylight','A building made of sunlit planes and deep shade.','Lisbon'],
  ['architecture','photo-1483366774565-c783b9f70e2c','Concrete building seen from below','The angle you get when you forget to keep walking.','London'],
  ['architecture','photo-1572883454114-1cf0031ede2a','High-rise buildings beneath an overcast sky','The cloudy sky flattened the towers into a drawing.','Tokyo'],
  ['landscape','photo-1537819191377-d3305ffddce4','Canyon beneath a sky full of stars','We stayed until the canyon became a silhouette.','Utah'],
  ['landscape','photo-1506744038136-46273834b3fb','River and granite cliffs in Yosemite Valley','The river was quiet; the cliffs had all the scale.','Yosemite'],
  ['landscape','photo-1773691323862-b33577111b0a','Jagged mountain peaks at sunset','The last light held on to the highest ridge.','Dolomites'],
  ['landscape','photo-1501785888041-af3ef285b470','Three wooden boats floating on a blue lake','Three empty boats made the lake look even stiller.','Lake Bled'],
  ['landscape','photo-1773176647951-d8f618dee942','Sunset above a dark mountain valley','The valley went dark before the sky did.','Alps'],
  ['landscape','photo-1470071459604-3b5ec3a7fe05','Fog around a mountain summit','At dawn the ridge kept appearing and disappearing.','Swiss Alps'],
  ['landscape','photo-1511884642898-4c92249e20b6','Forest viewed from above','From above the trees look almost like a tide.','Norway'],
  ['landscape','photo-1464822759023-fed622ff2c3b','Snowy mountains beyond a wooded valley','A line of snow above the green valley.','Rocky Mountains'],
  ['landscape','photo-1506260408121-e353d10b87c7','Green hills beneath cloudy sky','The hills kept changing color under passing clouds.','Scotland'],
  ['landscape','photo-1532274402911-5a369e4c4bb5','Flower-lined path leading toward a lake','Followed the purple path all the way to the water.','Lake Atitlan'],
  ['portrait','photo-1506863530036-1efeddceb993','Black and white portrait of a woman wearing a necklace','A portrait made between one sentence and the next.','Paris'],
  ['portrait','photo-1606122017369-d782bbb78f32','Woman wearing a blue striped shirt','Blue stripes against the light from the window.','Seoul'],
  ['portrait','photo-1544124094-8aea0374da93','Black and white portrait of a woman in a hijab','She chose the frame, the angle, and the moment.','London'],
  ['portrait','photo-1536766768598-e09213fdcf22','Portrait of a woman in a brown headscarf','A few quiet minutes after the conversation ended.','Istanbul'],
  ['portrait','photo-1606143412458-acc5f86de897','Woman in a black top','The simplest portrait from the longest shoot.','New York'],
  ['portrait','photo-1624711517157-25991163e537','Woman with brown hair wearing a red hoodie','The red hood held its own against the grey day.','London'],
  ['portrait','photo-1674932668403-33398b81c92f','Close portrait of a woman with a ponytail','A small change of expression just before the shutter.','Seoul'],
  ['portrait','photo-1603775020644-eb8decd79994','Woman in a polka dot shirt','She asked me to wait until she had stopped laughing.','Paris'],
  ['portrait','photo-1563170446-9c3c0622d8a9','Portrait of a woman in a white top','Window light was all this portrait needed.','Copenhagen'],
  ['portrait','photo-1617744966315-b3c950c430c7','Woman wearing a floral hijab','Flowers in the fabric and sunlight on her face.','Istanbul'],
  ['food','photo-1568901346375-23c9450c58cd','Burger with lettuce and tomatoes','The first bite was worth the long queue.','New York'],
  ['food','photo-1478145046317-39f10e56b5e9','Fruit arranged on a plate','Breakfast turned into a little color study.','Seoul'],
  ['food','photo-1556761223-4c4282c73f77','Fork lifting spaghetti','The pasta disappeared before the conversation did.','Rome'],
  ['food','photo-1532980400857-e8d9d275d858','Pancakes topped with fruit','Blueberries, orange, and a breakfast that ran late.','London'],
  ['food','photo-1550547660-d9450f859349','Burger served on a wooden tray','We split the fries but kept our own burgers.','Los Angeles'],
  ['food','photo-1563379926898-05f4575a45d8','Noodles with shrimp','Steam over the table on a cold evening.','Seoul'],
  ['food','photo-1552611052-33e04de081de','Bowl of seafood ramen','Finished every last spoonful of broth.','Tokyo'],
  ['food','photo-1625813506062-0aeb1d7a094b','Burger ingredients suspended above a bun','A burger taken apart for one impossible second.','New York'],
  ['food','photo-1554520735-0a6b8b6ce8b7','Stack of pancakes with syrup','The syrup took the scenic route down the stack.','Paris'],
  ['food','photo-1546549032-9571cd6b27df','Plate of pasta with a fork','A plate that made everyone stop talking.','Rome'],
  ['fashion','photo-1509631179647-0177331693ae','Woman posing in a white sleeveless top','White fabric, clear light, no other props.','Paris'],
  ['fashion','photo-1601597565151-70c4020dc0e1','Woman in a black and white long-sleeved dress','The dress changes shape each time she turns.','London'],
  ['fashion','photo-1662532577856-e8ee8b138a8b','Woman in red against a blue sky','Red against blue; the sky made the styling decision.','Seoul'],
  ['fashion','photo-1612731486606-2614b4d74921','Woman in a black blazer and pearl necklace','A black blazer and one line of pearls.','New York'],
  ['fashion','photo-1613915617430-8ab0fd7c6baf','Person in a blazer and trousers','The cut of the jacket does the talking.','Copenhagen'],
  ['fashion','photo-1704208316515-a32f81e373ef','Woman in a black dress on a red background','Black dress on red, held in one deliberate pose.','Paris'],
  ['fashion','photo-1586079615844-c0abfb04dc79','Woman in a black sleeveless dress','A dress that follows the movement instead of stopping it.','London'],
  ['fashion','photo-1731589802956-b4693dae884b','Man in a black coat over a red shirt','The red shirt appears only when the coat opens.','Seoul'],
  ['fashion','photo-1731589802397-6a1088d63630','Woman in black coat and sunglasses','Sunglasses after the sun had gone.','New York'],
  ['fashion','photo-1610765431323-d88c88a2b2c8','Woman wearing a black suit jacket','The suit sits comfortably in the frame.','Paris'],
];

const accountDetails: [string, string, string, string, string, string, string][] = [
  ['you','mira.cho','Mira Cho','Books, walks and the light between them.','Seoul','1,248','634'],
  ['street','eli.on.foot','Eli Carter','Street corners and the people passing through.','New York','8,402','581'],
  ['interior','studio.ordinary','Studio Ordinary','Rooms to spend a little time in.','Seoul','56.1K','312'],
  ['flowers','atelier.noon','Atelier Noon','Stems, gardens and changing light.','Seoul','24.8K','402'],
  ['cafe','tables.for.two','Tables for Two','A seat by the window, wherever we go.','Lisbon','12.3K','907'],
  ['books','margin.notes','Margin Notes','Books found, read and left open.','Seoul','3,491','221'],
  ['architecture','form.walks','Form Walks','Buildings from the pavement up.','Copenhagen','48.2K','316'],
  ['landscape','between.ridges','Between Ridges','Away for a while.','Yosemite','17.6K','288'],
  ['portrait','human.frames','Human Frames','Portraits and the time around them.','Paris','9,114','745'],
  ['food','after.lunch','After Lunch','What was on the table today.','Rome','31.7K','533'],
  ['fashion','still.in.motion','Still in Motion','People, clothes and gestures.','London','62.4K','472'],
];

export const accounts: Account[] = accountDetails.map(([id,name,fullName,bio,location,followers,following]) => {
  const firstImage = entries.find(entry => entry[0] === (id === 'you' ? 'books' : id))?.[1] || entries[0][1];
  return { id, name, fullName, avatar: photo(firstImage), bio, location, followers, following };
});

const captionOverrides: Record<number, string> = {
  0: 'Caught the rain just before the avenue cleared. I walked another block to get the Chrysler Building in frame — worth the wet shoes.',
  10: 'A room we visited yesterday. The best part was how the brown furniture warmed up all that white.',
  20: 'Pink roses are back on the studio table today. We have a few bundles at the shop until 5pm 🌷',
  30: 'Meet our new barista, Jo. They have somehow memorized everyone’s order already.',
  40: 'I opened three books this morning and finished none. Does anyone else read like this?',
  50: 'A building I keep returning to. The blue sky made its white planes look almost paper thin.',
  60: 'A late night outside the tent. We turned off our lights and the canyon seemed to get bigger.',
  70: 'A quick portrait with Lena after coffee. This was the frame between the posed ones.',
  80: 'Lunch report: excellent burger, barely enough napkins, absolutely no regrets.',
  90: 'The shirt, the light, the pose. Keeping this look exactly as we shot it.',
  1: 'Walked past this place twice. Came back for the empty tables and that last bit of window light.',
  11: 'Plant update: it has outgrown its corner again. The afternoon sun has been generous.',
  21: 'A few stems from today’s market run. We tried a blue-and-white arrangement for the front window.',
  31: 'Patio season starts now. We pulled out the chairs this morning; come by if you’re in the neighborhood.',
  41: 'The stack on my desk is getting ridiculous. Recommendations welcome, though clearly I do not need any more.',
  51: 'Copenhagen walk, part two. I was looking at the curve while everyone else was looking for lunch.',
  61: 'The river was so quiet that we could hear people on the opposite trail.',
  71: 'I asked her to stand by the window for a second and the stripes did the rest.',
  81: 'Cut fruit, coffee, no timetable. More mornings like this, please.',
  91: 'A black-and-white dress that changes shape when you move. We shot it in one take.',
};

const commentsByPost: Record<number, Comment[]> = {
  0: [{id:'c0',author:'margin.notes',body:'That reflection on the pavement!'}],
  10: [{id:'c10',author:'mira.cho',body:'The warm wood is so good here.'}],
  20: [{id:'c20',author:'human.frames',body:'Saving a bundle for my desk 🌷'}],
  30: [{id:'c30',author:'mira.cho',body:'Tell Jo I will be there tomorrow.'}],
  40: [{id:'c40',author:'eli.on.foot',body:'Yes. Three open books is the minimum.'}],
  50: [{id:'c50',author:'studio.ordinary',body:'The negative space is lovely.'}],
  60: [{id:'c60',author:'eli.on.foot',body:'How late did you stay out?'}],
  70: [{id:'c70',author:'still.in.motion',body:'The unposed frame always wins.'}],
  80: [{id:'c80',author:'tables.for.two',body:'The napkin situation is familiar.'}],
  90: [{id:'c90',author:'human.frames',body:'One take! Incredible.'}],
  31: [{id:'c31',author:'after.lunch',body:'Saving a seat for Friday.'}],
  51: [{id:'c51',author:'between.ridges',body:'The curve is worth the detour.'}],
};

export const initialPosts: Post[] = [
  ...entries.map(([accountId,imageId,alt,caption,location], index) => ({
    id: `p${index + 1}`, accountId: index >= 40 && index < 44 ? 'you' : accountId,
    image: photo(imageId), alt, caption: captionOverrides[index] || caption, location,
    likes: 243 + ((index * 173) % 8700), age: `${(index % 18) + 1}h`,
    comments: commentsByPost[index] || [], own: index >= 40 && index < 44,
  })).sort((a, b) => {
    const ai = Number(a.id.slice(1)) - 1;
    const bi = Number(b.id.slice(1)) - 1;
    return (ai % 10) - (bi % 10) || Math.floor(ai / 10) - Math.floor(bi / 10);
  }),
  { id:'r1', accountId:'portrait', image:photo('photo-1758671916868-b853bc18d031'), alt:'Dancers practicing at a studio barre', caption:'One more count before we call it a day.', location:'Paris', video:'/video/videos/67-dance.mp4', likes:7621, age:'4h', comments:[], reel:true },
  { id:'r2', accountId:'interior', image:photo('photo-1673815981462-80343d95a0e6'), alt:'Grey cat lying on a bed', caption:'A very unhurried morning.', location:'Seoul', video:'/video/videos/cat-on-bed.mp4', likes:12842, age:'8h', comments:[], reel:true },
];

// Fictional social graph used by the 2026-10-11 fidelity pass.
export const closeFriends = ['portrait'];
export const verifiedAccounts = ['interior', 'fashion'];
export type ThreadMessage = { id: string; from: 'me' | 'them'; body: string };
export const seedThreads: Record<string, ThreadMessage[]> = {
  flowers: [{id:'t1',from:'them',body:'We saved you a bundle of the blue stems'},{id:'t2',from:'them',body:'Pick up before 5?'}],
  street: [{id:'t3',from:'me',body:'That Chrysler shot is unreal'},{id:'t4',from:'them',body:'Worth the wet shoes 😅'}],
  books: [{id:'t5',from:'them',body:'Finished the one you lent me'}],
  cafe: [{id:'t6',from:'me',body:'Friday still on?'},{id:'t7',from:'them',body:'Window table is ours'}],
  portrait: [{id:'t8',from:'them',body:'Sent you the unposed frames'}],
};
export const threadAges: Record<string, string> = { flowers: '12m', street: '1h', books: '3h', cafe: '1d', portrait: '2d' };
export const initiallyUnread = ['flowers', 'books'];
