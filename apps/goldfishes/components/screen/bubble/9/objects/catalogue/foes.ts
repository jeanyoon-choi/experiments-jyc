// 금붕어의 천적 (bubble/9, user 2026-11-11): what a goldfish dies of — its natural enemies and, seen from the
// Anthropocene, everything else that ends it: the birds, mammals, fish, amphibians, insects and reptiles that eat it,
// the parasites and microbes that sicken it, and the things people made (tackle, the bowl and the bag, the drain,
// chlorine and detergent, plastic, fuel, heat). "금붕어는 결국 죽는다, 인위적인 것들로."
//
// Every kind is a model (types.ts ModelMake): sculpted by hand from lofted masses and primitives (foes-kit.ts;
// the living in foes-living.ts, the made in foes-artefacts.ts), no data taken from anywhere, no paint. Each is shown
// in the view that names it and keeps only silhouette and main masses, thin parts made plump (object party rules).
// Left out, and why: 갈매기 (a generic bird in flight), 병뚜껑 (a crimped disc reads as a tart), 온도계 (a stick and a
// ball), 냉각탑 (read as a vase under its plume), 담배꽁초, 빨대, 젓가락 (plain rods: known by print or context), 물곰팡이 (no form of its own), 수조 히터 and
// 배수구 마개 (not known by outline), 박테리오파지 (does not kill fish).

import type { BufferGeometry } from "three";
import { ARTEFACTS } from "./foes-artefacts.ts";
import { LIVING } from "./foes-living.ts";
import type { CatalogueGroup, CatalogueKind, ModelMake } from "./types.ts";

const model = (parts: () => BufferGeometry[], fill = 1.2): ModelMake => ({ source: "model", fill, parts });

const group: CatalogueGroup = {
  id: "foes",
  label: "금붕어의 천적",
  kinds: [
    { id: "foeHeron", label: "왜가리", feed: "Heron", sub: "새", make: model(LIVING.heron) },
    { id: "foeEgret", label: "백로", feed: "Egret", sub: "새", make: model(LIVING.egret) },
    { id: "foeCormorant", label: "가마우지", feed: "Cormorant", sub: "새", make: model(LIVING.cormorant) },
    { id: "foeKingfisher", label: "물총새", feed: "Kingfisher", sub: "새", make: model(LIVING.kingfisher) },
    { id: "foePelican", label: "펠리컨", feed: "Pelican", sub: "새", make: model(LIVING.pelican) },
    { id: "foeCat", label: "고양이", feed: "Cat", sub: "포유류", make: model(LIVING.cat) },
    { id: "foeOtter", label: "수달", feed: "Otter", sub: "포유류", make: model(LIVING.otter) },
    { id: "foeRaccoonDog", label: "너구리", feed: "Raccoon dog", sub: "포유류", make: model(LIVING.raccoonDog) },
    { id: "foeBear", label: "곰", feed: "Bear", sub: "포유류", make: model(LIVING.bear) },
    { id: "foeHand", label: "사람 손", feed: "Hand", sub: "포유류", make: model(LIVING.hand) },
    { id: "foeBass", label: "큰입배스", feed: "Bass", sub: "물고기·양서류", make: model(LIVING.bass) },
    { id: "foeSnakehead", label: "가물치", feed: "Snakehead", sub: "물고기·양서류", make: model(LIVING.snakehead) },
    { id: "foeCatfish", label: "메기", feed: "Catfish", sub: "물고기·양서류", make: model(LIVING.catfish) },
    { id: "foeBullfrog", label: "황소개구리", feed: "Bullfrog", sub: "물고기·양서류", make: model(LIVING.bullfrog) },
    { id: "foePike", label: "강꼬치고기", feed: "Pike", sub: "물고기·양서류", make: model(LIVING.pike) },
    { id: "foeWaterBug", label: "물장군", feed: "Water bug", sub: "수서곤충·갑각류", make: model(LIVING.waterBug) },
    { id: "foeWaterStick", label: "게아재비", feed: "Water scorpion", sub: "수서곤충·갑각류", make: model(LIVING.waterStick) },
    { id: "foeDragonflyNymph", label: "잠자리 유충", feed: "Dragonfly nymph", sub: "수서곤충·갑각류", make: model(LIVING.dragonflyNymph) },
    { id: "foeDivingBeetle", label: "물방개", feed: "Diving beetle", sub: "수서곤충·갑각류", make: model(LIVING.divingBeetle) },
    { id: "foeCrayfish", label: "가재", feed: "Crayfish", sub: "수서곤충·갑각류", make: model(LIVING.crayfish) },
    { id: "foeSoftshell", label: "자라", feed: "Softshell turtle", sub: "파충류", make: model(LIVING.softshell) },
    { id: "foeTurtle", label: "거북", feed: "Turtle", sub: "파충류", make: model(LIVING.turtle) },
    { id: "foeSnake", label: "물뱀", feed: "Snake", sub: "파충류", make: model(LIVING.snake) },
    { id: "foeAnchorWorm", label: "닻벌레", feed: "Anchor worm", sub: "미생물·기생", make: model(LIVING.anchorWorm) },
    { id: "foeFishLouse", label: "물이", feed: "Fish louse", sub: "미생물·기생", make: model(LIVING.fishLouse) },
    { id: "foeIch", label: "백점충", feed: "Ich", sub: "미생물·기생", make: model(LIVING.ich) },
    { id: "foeVirus", label: "헤르페스바이러스", feed: "Virus", sub: "미생물·기생", make: model(LIVING.virus) },
    { id: "foeBacterium", label: "에로모나스균", feed: "Bacteria", sub: "미생물·기생", make: model(LIVING.bacterium) },
    { id: "foeLeech", label: "거머리", feed: "Leech", sub: "미생물·기생", make: model(LIVING.leech) },
    { id: "foeHydra", label: "히드라", feed: "Hydra", sub: "미생물·기생", make: model(LIVING.hydra) },
    { id: "foeHook", label: "낚싯바늘", feed: "Hook", sub: "낚시·채집", make: model(ARTEFACTS.hook) },
    { id: "foeScoopNet", label: "뜰채", feed: "Net", sub: "낚시·채집", make: model(ARTEFACTS.scoopNet) },
    { id: "foeTrident", label: "작살", feed: "Spear", sub: "낚시·채집", make: model(ARTEFACTS.trident) },
    { id: "foeFloat", label: "낚시찌", feed: "Float", sub: "낚시·채집", make: model(ARTEFACTS.float) },
    { id: "foeLure", label: "루어", feed: "Lure", sub: "낚시·채집", make: model(ARTEFACTS.lure) },
    { id: "foeBowl", label: "어항", feed: "Fishbowl", sub: "집·부엌", make: model(ARTEFACTS.bowl) },
    { id: "foeBag", label: "금붕어 봉지", feed: "Bag", sub: "집·부엌", make: model(ARTEFACTS.bag) },
    { id: "foeToilet", label: "변기", feed: "Toilet", sub: "집·부엌", make: model(ARTEFACTS.toilet) },
    { id: "foeTap", label: "수도꼭지", feed: "Tap", sub: "집·부엌", make: model(ARTEFACTS.tap) },
    { id: "foeJug", label: "락스통", feed: "Bleach", sub: "집·부엌", make: model(ARTEFACTS.jug) },
    { id: "foeSprayer", label: "분무기", feed: "Spray", sub: "집·부엌", make: model(ARTEFACTS.sprayer) },
    { id: "foeBlender", label: "믹서기", feed: "Blender", sub: "집·부엌", make: model(ARTEFACTS.blender) },
    { id: "foePan", label: "프라이팬", feed: "Pan", sub: "집·부엌", make: model(ARTEFACTS.pan) },
    { id: "foeFork", label: "포크", feed: "Fork", sub: "집·부엌", make: model(ARTEFACTS.fork) },
    { id: "foeKnife", label: "식칼", feed: "Knife", sub: "집·부엌", make: model(ARTEFACTS.knife) },
    { id: "foeBucket", label: "양동이", feed: "Bucket", sub: "집·부엌", make: model(ARTEFACTS.bucket) },
    { id: "foePetBottle", label: "페트병", feed: "Bottle", sub: "버려진 것", make: model(ARTEFACTS.petBottle) },
    { id: "foeSixPack", label: "식스팩 링", feed: "Six-pack rings", sub: "버려진 것", make: model(ARTEFACTS.sixPack) },
    { id: "foeCan", label: "캔", feed: "Can", sub: "버려진 것", make: model(ARTEFACTS.can) },
    { id: "foeBattery", label: "건전지", feed: "Battery", sub: "버려진 것", make: model(ARTEFACTS.battery) },
    { id: "foePill", label: "알약", feed: "Pill", sub: "버려진 것", make: model(ARTEFACTS.pill) },
    { id: "foeSyringe", label: "주사기", feed: "Syringe", sub: "버려진 것", make: model(ARTEFACTS.syringe) },
    { id: "foeMask", label: "마스크", feed: "Mask", sub: "버려진 것", make: model(ARTEFACTS.mask) },
    { id: "foeTyre", label: "타이어", feed: "Tyre", sub: "버려진 것", make: model(ARTEFACTS.tyre) },
    { id: "foeCup", label: "일회용 컵", feed: "Cup", sub: "버려진 것", make: model(ARTEFACTS.cup) },
    { id: "foeLighter", label: "라이터", feed: "Lighter", sub: "버려진 것", make: model(ARTEFACTS.lighter) },
    { id: "foeBulb", label: "전구", feed: "Light bulb", sub: "버려진 것", make: model(ARTEFACTS.bulb) },
    { id: "foeDrum", label: "드럼통", feed: "Oil drum", sub: "산업", make: model(ARTEFACTS.drum) },
    { id: "foeJerrycan", label: "제리캔", feed: "Jerrycan", sub: "산업", make: model(ARTEFACTS.jerrycan) },
    { id: "foeFactory", label: "공장", feed: "Factory", sub: "산업", make: model(ARTEFACTS.factory) },
    { id: "foeOutfall", label: "배수관", feed: "Outfall", sub: "산업", make: model(ARTEFACTS.outfall) },
  ] satisfies CatalogueKind[],
};

export default group;
