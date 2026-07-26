// lib/albionItems.js
export const ALBION_ITEMS = {
  bags: [
    { name: 'Brak Torby', id: '' },
    { name: 'Torba T8', id: 'T8_BAG' },
    { name: 'Torba T7', id: 'T7_BAG' },
    { name: 'Torba T6', id: 'T6_BAG' },
    { name: 'Torba T5', id: 'T5_BAG' },
    { name: 'Torba T4', id: 'T4_BAG' },
    { name: 'Torba T3', id: 'T3_BAG' },
  ],
    weapons: [
    // Cursed Staves
    { name: 'Laska Klątw T8 (Cursed Staff)', id: 'T8_MAIN_CURSESTAFF' },
    { name: 'Laska Klątw T7', id: 'T7_MAIN_CURSESTAFF' },
    { name: 'Laska Klątw T6', id: 'T6_MAIN_CURSESTAFF' },
    { name: 'Laska Klątw T5', id: 'T5_MAIN_CURSESTAFF' },
    { name: 'Wielka Laska Klątw T8 (Great Cursed Staff)', id: 'T8_2H_CURSESTAFF' },
    { name: 'Wielka Laska Klątw T6', id: 'T6_2H_CURSESTAFF' },
    { name: 'Wielka Laska Klątw T4', id: 'T4_2H_CURSESTAFF' },
    { name: 'Piekielna Laska T8 (Demonic Staff)', id: 'T8_2H_DEMONICSTAFF' },
    { name: 'Piekielna Laska T6', id: 'T6_2H_DEMONICSTAFF' },
    
    // Holy Staves
    { name: 'Laska Świętego T8 (Holy Staff)', id: 'T8_MAIN_HOLYSTAFF' },
    { name: 'Laska Świętego T6', id: 'T6_MAIN_HOLYSTAFF' },
    
    // Nature Staves
    { name: 'Laska Natury T8 (Nature Staff)', id: 'T8_MAIN_NATURESTAFF' },
    { name: 'Laska Natury T6', id: 'T6_MAIN_NATURESTAFF' },
    { name: 'Wielka Laska Natury T8 (Great Nature Staff)', id: 'T8_2H_NATURESTAFF' },
    { name: 'Wielka Laska Natury T6', id: 'T6_2H_NATURESTAFF' },
    
    // Fire Staves
    { name: 'Ognista Laska T8 (Fire Staff)', id: 'T8_MAIN_FIRESTAFF' },
    { name: 'Ognista Laska T6', id: 'T6_MAIN_FIRESTAFF' },
    { name: 'Wielka Ognista Laska T8 (Great Fire Staff)', id: 'T8_2H_FIRESTAFF' },
    { name: 'Wielka Ognista Laska T6', id: 'T6_2H_FIRESTAFF' },
    
    // Frost Staves
    { name: 'Mroźna Laska T8 (Frost Staff)', id: 'T8_MAIN_FROSTSTAFF' },
    { name: 'Mroźna Laska T6', id: 'T6_MAIN_FROSTSTAFF' },
    { name: 'Wielka Mroźna Laska T8 (Great Frost Staff)', id: 'T8_2H_FROSTSTAFF' },
    { name: 'Wielka Mroźna Laska T6', id: 'T6_2H_FROSTSTAFF' },
    
    // Axes
    { name: 'Topór Bojowy T8 (Battleaxe)', id: 'T8_MAIN_AXE' },
    { name: 'Topór Bojowy T6', id: 'T6_MAIN_AXE' },
    { name: 'Topór Bojowy T4', id: 'T4_MAIN_AXE' },
    { name: 'Halabarda T8 (Halberd)', id: 'T8_2H_HALBERD' },
    { name: 'Halabarda T6', id: 'T6_2H_HALBERD' },
    { name: 'Topór Dwuręczny T8 (Greataxe)', id: 'T8_2H_AXE' },
    { name: 'Topór Dwuręczny T6', id: 'T6_2H_AXE' },
    
    // Swords
    { name: 'Szeroki Miecz T8 (Broadsword)', id: 'T8_MAIN_SWORD' },
    { name: 'Szeroki Miecz T6', id: 'T6_MAIN_SWORD' },
    { name: 'Zwykłe Miecze T8 (Dual Swords)', id: 'T8_2H_DUALSWORD' },
    { name: 'Zwykłe Miecze T6', id: 'T6_2H_DUALSWORD' },
    { name: 'Miecz Rzeźnika T8 (Carving Sword)', id: 'T8_2H_CLEAVER_HELL' },
    { name: 'Miecz Rzeźnika T6', id: 'T6_2H_CLEAVER_HELL' },
    
    // Daggers
    { name: 'Sztylet T8 (Dagger)', id: 'T8_MAIN_DAGGER' },
    { name: 'Sztylet T6', id: 'T6_MAIN_DAGGER' },
    { name: 'Sztylety T8 (Dagger Pair)', id: 'T8_2H_DAGGERPAIR' },
    { name: 'Sztylety T6', id: 'T6_2H_DAGGERPAIR' },
    
    // Bows
    { name: 'Zwykły Łuk T8 (Bow)', id: 'T8_2H_BOW' },
    { name: 'Zwykły Łuk T6', id: 'T6_2H_BOW' },
    { name: 'Wielki Łuk T8 (Warbow)', id: 'T8_2H_WARBOW' },
    { name: 'Wielki Łuk T6', id: 'T6_2H_WARBOW' },
    
    // Crossbows
    { name: 'Lekka Kusza T8 (Light Crossbow)', id: 'T8_MAIN_1HCROSSBOW' },
    { name: 'Lekka Kusza T6', id: 'T6_MAIN_1HCROSSBOW' },
    { name: 'Ciężka Kusza T8 (Heavy Crossbow)', id: 'T8_2H_CROSSBOW' },
    { name: 'Ciężka Kusza T6', id: 'T6_2H_CROSSBOW' },
    
    // Spears
    { name: 'Włócznia T8 (Spear)', id: 'T8_MAIN_SPEAR' },
    { name: 'Włócznia T6', id: 'T6_MAIN_SPEAR' },
    
    // Hammers
    { name: 'Młot T8 (Hammer)', id: 'T8_2H_HAMMER' },
    { name: 'Młot T6', id: 'T6_2H_HAMMER' },
    
    // Maces
    { name: 'Buława T8 (Mace)', id: 'T8_MAIN_MACE' },
    { name: 'Buława T6', id: 'T6_MAIN_MACE' },
    
    // Brawler Gloves
    { name: 'Rękawice Bojowe T8 (Brawler Gloves)', id: 'T8_2H_BRAWLER' },
    { name: 'Rękawice Bojowe T6', id: 'T6_2H_BRAWLER' },
  ],
  offhands: [
    { name: 'Brak / Broń Dwuręczna', id: '' },
    { name: 'Muisak T8 (Cursed Tome)', id: 'T8_OFF_TOME_CUTRATH' },
    { name: 'Muisak T6', id: 'T6_OFF_TOME_CUTRATH' },
    { name: 'Muisak T4', id: 'T4_OFF_TOME_CUTRATH' },
    { name: 'Tarcza Stróża T8 (Aegis Shield)', id: 'T8_OFF_SHIELD_HELL' },
    { name: 'Tarcza Stróża T6', id: 'T6_OFF_SHIELD_HELL' },
    { name: 'Tarcza Stróża T4', id: 'T4_OFF_SHIELD_HELL' },
    { name: 'Odłamana Tarcza T8 (Facebreaker Shield)', id: 'T8_OFF_SPIKEDSHIELD_MORGANA' },
    { name: 'Rogowy Róg T8 (Mistcaller)', id: 'T8_OFF_HORN_KEEPER' },
    { name: 'Gwiezdny Korzeń T8 (Taproot)', id: 'T8_OFF_JAVELIN_MORGANA' },
    { name: 'Zwykła Tarcza T8 (Kite Shield)', id: 'T8_OFF_SHIELD' },
    { name: 'Zwykła Tarcza T6', id: 'T6_OFF_SHIELD' },
  ],
  heads: [
    { name: 'Kaptur Łowcy T8 (Hunter Hood)', id: 'T8_HEAD_LEATHER_SET3' },
    { name: 'Kaptur Łowcy T7', id: 'T7_HEAD_LEATHER_SET3' },
    { name: 'Kaptur Łowcy T6', id: 'T6_HEAD_LEATHER_SET3' },
    { name: 'Kaptur Łowcy T5', id: 'T5_HEAD_LEATHER_SET3' },
    { name: 'Kaptur Kleryka T8 (Cleric Cowl)', id: 'T8_HEAD_CLOTH_SET2' },
    { name: 'Kaptur Kleryka T6', id: 'T6_HEAD_CLOTH_SET2' },
    { name: 'Czapka Najemnika T8 (Mercenary Hood)', id: 'T8_HEAD_LEATHER_SET1' },
    { name: 'Czapka Najemnika T6', id: 'T6_HEAD_LEATHER_SET1' },
    { name: 'Hełm Żołnierza T8 (Soldier Helmet)', id: 'T8_HEAD_PLATE_SET1' },
    { name: 'Hełm Żołnierza T6', id: 'T6_HEAD_PLATE_SET1' },
    { name: 'Hełm Stróża T8 (Guardian Helmet)', id: 'T8_HEAD_PLATE_SET3' },
    { name: 'Hełm Stróża T6', id: 'T6_HEAD_PLATE_SET3' },
    { name: 'Kaptur Maga T8 (Mage Cowl)', id: 'T8_HEAD_CLOTH_SET3' },
    { name: 'Kaptur Maga T6', id: 'T6_HEAD_CLOTH_SET3' },
    { name: 'Kaptur Zabójcy T8 (Assassin Hood)', id: 'T8_HEAD_LEATHER_SET2' },
    { name: 'Kaptur Zabójcy T6', id: 'T6_HEAD_LEATHER_SET2' },
  ],
  armors: [
    { name: 'Kurtka Najemnika T8 (Mercenary Jacket)', id: 'T8_ARMOR_LEATHER_SET1' },
    { name: 'Kurtka Najemnika T7', id: 'T7_ARMOR_LEATHER_SET1' },
    { name: 'Kurtka Najemnika T6', id: 'T6_ARMOR_LEATHER_SET1' },
    { name: 'Kurtka Najemnika T5', id: 'T5_ARMOR_LEATHER_SET1' },
    { name: 'Kurtka Najemnika T4', id: 'T4_ARMOR_LEATHER_SET1' },
    { name: 'Szata Kleryka T8 (Cleric Robe)', id: 'T8_ARMOR_CLOTH_SET2' },
    { name: 'Szata Kleryka T7', id: 'T7_ARMOR_CLOTH_SET2' },
    { name: 'Szata Kleryka T6', id: 'T6_ARMOR_CLOTH_SET2' },
    { name: 'Kurtka Zabójcy T8 (Assassin Jacket)', id: 'T8_ARMOR_LEATHER_SET2' },
    { name: 'Kurtka Zabójcy T7', id: 'T7_ARMOR_LEATHER_SET2' },
    { name: 'Kurtka Zabójcy T6', id: 'T6_ARMOR_LEATHER_SET2' },
    { name: 'Szata Maga T8 (Mage Robe)', id: 'T8_ARMOR_CLOTH_SET3' },
    { name: 'Szata Maga T7', id: 'T7_ARMOR_CLOTH_SET3' },
    { name: 'Szata Maga T6', id: 'T6_ARMOR_CLOTH_SET3' },
    { name: 'Pancerz Rycerza T8 (Knight Armor)', id: 'T8_ARMOR_PLATE_SET2' },
    { name: 'Pancerz Rycerza T6', id: 'T6_ARMOR_PLATE_SET2' },
    { name: 'Pancerz Stróża T8 (Guardian Armor)', id: 'T8_ARMOR_PLATE_SET3' },
    { name: 'Pancerz Stróża T6', id: 'T6_ARMOR_PLATE_SET3' },
    { name: 'Hellion Jacket T8', id: 'T8_ARMOR_LEATHER_HELL' },
    { name: 'Stalker Jacket T8', id: 'T8_ARMOR_LEATHER_MORGANA' },
  ],
  shoes: [
    { name: 'Sandały Kleryka T8 (Cleric Sandals)', id: 'T8_SHOES_CLOTH_SET2' },
    { name: 'Sandały Kleryka T7', id: 'T7_SHOES_CLOTH_SET2' },
    { name: 'Sandały Kleryka T6', id: 'T6_SHOES_CLOTH_SET2' },
    { name: 'Sandały Kleryka T4', id: 'T4_SHOES_CLOTH_SET2' },
    { name: 'Buty Żołnierza T8 (Soldier Boots)', id: 'T8_SHOES_PLATE_SET1' },
    { name: 'Buty Żołnierza T7', id: 'T7_SHOES_PLATE_SET1' },
    { name: 'Buty Żołnierza T6', id: 'T6_SHOES_PLATE_SET1' },
    { name: 'Buty Łowcy T8 (Hunter Boots)', id: 'T8_SHOES_LEATHER_SET3' },
    { name: 'Buty Łowcy T7', id: 'T7_SHOES_LEATHER_SET3' },
    { name: 'Buty Łowcy T6', id: 'T6_SHOES_LEATHER_SET3' },
    { name: 'Buty Królewskie T8 (Royal Shoes)', id: 'T8_SHOES_ROYAL' },
    { name: 'Buty Królewskie T6', id: 'T6_SHOES_ROYAL' },
    { name: 'Demon Boots T8', id: 'T8_SHOES_PLATE_HELL' },
  ],
  capes: [
    { name: 'Peleryna Caerleon T8', id: 'T8_CAPEITEM_FW_CAERLEON' },
    { name: 'Peleryna Caerleon T6', id: 'T6_CAPEITEM_FW_CAERLEON' },
    { name: 'Peleryna Caerleon T4', id: 'T4_CAPEITEM_FW_CAERLEON' },
    { name: 'Peleryna Bridgewatch T8', id: 'T8_CAPEITEM_FW_BRIDGEWATCH' },
    { name: 'Peleryna Thetford T8', id: 'T8_CAPEITEM_FW_THETFORD' },
    { name: 'Peleryna Lymhurst T8', id: 'T8_CAPEITEM_FW_LYMHURST' },
    { name: 'Peleryna Martlock T8', id: 'T8_CAPEITEM_FW_MARTLOCK' },
    { name: 'Zwykła Peleryna T8', id: 'T8_CAPE' },
    { name: 'Zwykła Peleryna T6', id: 'T6_CAPE' },
    { name: 'Zwykła Peleryna T4', id: 'T4_CAPE' },
  ],
    potions: [
    { name: 'Brak Mikstury', id: '' },
    { name: 'Mikstura Zdrowia T8', id: 'T8_POTION_HEAL' }, // Zostawiamy lub zmieniamy na inną działającą potkę
    { name: 'Mikstura Zdrowia T7', id: 'T7_POTION_HEAL_LAND' },
    { name: 'Mikstura Zdrowia T6', id: 'T6_POTION_HEAL_LAND' },
    { name: 'Mikstura Zdrowia T5', id: 'T5_POTION_HEAL_LAND' },
    { name: 'Mikstura Zdrowia T4', id: 'T4_POTION_HEAL_LAND' },
    { name: 'Mikstura Giganta T8 (Gigantify Potion)', id: 'T8_POTION_GIGANTIFY' },
    { name: 'Mikstura Giganta T6', id: 'T6_POTION_GIGANTIFY' },
    { name: 'Mikstura Odporności T8 (Resistance Potion)', id: 'T8_POTION_RESISTANCE' },
    { name: 'Mikstura Odporności T6', id: 'T6_POTION_RESISTANCE' },
    { name: 'Mikstura Niewidzialności T8 (Invisible Potion)', id: 'T8_POTION_ENERGY' },
  ],
  mounts: [
    { name: 'Brak Wierzchowca', id: '' },
    { name: 'Koń T8 (Armored Horse)', id: 'T8_MOUNT_HORSE' },
    { name: 'Koń T7', id: 'T7_MOUNT_HORSE' },
    { name: 'Koń T6', id: 'T6_MOUNT_HORSE' },
    { name: 'Koń T5', id: 'T5_MOUNT_HORSE' },
    { name: 'Koń T4', id: 'T4_MOUNT_HORSE' },
    { name: 'Mamut Transportowy T8', id: 'T8_MOUNT_MAMMOTH_TRANSPORT' },
    { name: 'Mamut Transportowy T7', id: 'T7_MOUNT_MAMMOTH_TRANSPORT' },
    { name: 'Mamut Transportowy T6', id: 'T6_MOUNT_MAMMOTH_TRANSPORT' },
    { name: 'Giant Stag T8', id: 'T8_MOUNT_GIANTSTAG' },
    { name: 'Giant Stag T6', id: 'T6_MOUNT_GIANTSTAG' },
    { name: 'Direwolf T8', id: 'T8_MOUNT_DIREWOLF' },
    { name: 'Direwolf T6', id: 'T6_MOUNT_DIREWOLF' },
    { name: 'Direboar T8', id: 'T8_MOUNT_DIREBOAR' },
    { name: 'Direboar T6', id: 'T6_MOUNT_DIREBOAR' },
    { name: 'Swiftclaw T8', id: 'T8_MOUNT_COUGAR_KEEPER' },
    { name: 'Basilisk T8', id: 'T8_MOUNT_BASILISK' },
    { name: 'Spectral Horse T8', id: 'T8_MOUNT_HORSE_UNDEAD' },
  ],
  foods: [
    { name: 'Brak Jedzenia', id: '' },
    { name: 'Omlet z Wieprzowiny T8 (Pork Omelette)', id: 'T8_MEAL_OMELETTE' },
    { name: 'Omlet z Wieprzowiny T7', id: 'T7_MEAL_OMELETTE' },
    { name: 'Omlet z Wieprzowiny T6', id: 'T6_MEAL_OMELETTE' },
    { name: 'Omlet z Wieprzowiny T5', id: 'T5_MEAL_OMELETTE' },
    { name: 'Omlet z Wieprzowiny T4', id: 'T4_MEAL_OMELETTE' },
    { name: 'Duszona Wołowina T8 (Beef Stew)', id: 'T8_MEAL_STEW' },
    { name: 'Duszona Wołowina T7', id: 'T7_MEAL_STEW' },
    { name: 'Duszona Wołowina T6', id: 'T6_MEAL_STEW' },
    { name: 'Pieczeń z Wieprzowiny T7 (Pork Roast)', id: 'T7_MEAL_ROAST' },
    { name: 'Pieczeń z Wieprzowiny T6', id: 'T6_MEAL_ROAST' },
    { name: 'Zupa Rybna T1 (Fish Soup)', id: 'T1_MEAL_SOUP' },
  ],
}

export const ALL_ITEMS_FLAT = Object.values(ALBION_ITEMS)
  .flat()
  .filter(item => item.id)

export const findItemByName = (searchTerm) => {
  if (!searchTerm || !searchTerm.trim()) return null
  const lower = searchTerm.toLowerCase().trim()
  const exact = ALL_ITEMS_FLAT.find(item => item.id.toLowerCase() === lower)
  if (exact) return exact
  const nameMatch = ALL_ITEMS_FLAT.find(item =>
    item.name.toLowerCase().includes(lower) || item.id.toLowerCase().includes(lower)
  )
  if (nameMatch) return nameMatch
  
  const fuzzyMatches = ALL_ITEMS_FLAT
    .map(item => ({
      item,
      score: calculateFuzzyScore(lower, item.name.toLowerCase()) + calculateFuzzyScore(lower, item.id.toLowerCase())
    }))
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
  
  return fuzzyMatches.length > 0 ? fuzzyMatches[0].item : null
}

export const findItemsByName = (searchTerm) => {
  if (!searchTerm || !searchTerm.trim()) return []
  const lower = searchTerm.toLowerCase().trim()
  const matches = ALL_ITEMS_FLAT
    .map(item => ({
      item,
      score: calculateFuzzyScore(lower, item.name.toLowerCase()) + calculateFuzzyScore(lower, item.id.toLowerCase())
    }))
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(m => m.item)
  return matches.slice(0, 10)
}

const calculateFuzzyScore = (search, target) => {
  let score = 0
  let searchIdx = 0
  for (let i = 0; i < target.length && searchIdx < search.length; i++) {
    if (target[i] === search[searchIdx]) {
      score += 10
      searchIdx++
    }
  }
  if (searchIdx === search.length) {
    score += search.length * 5
  }
  return score
}