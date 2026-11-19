// Guardrails: StyleScout only searches fashion (clothes, footwear, accessories).
// verdict: 'ok' | 'maybe' (unknown words: user may "search anyway") | 'block' (clearly not fashion)

const FASHION = /\b(t-?shirts?|tees?|tops?|shirts?|blouses?|crop|tank|camis?|jeans?|denims?|pants?|trousers?|cargos?|joggers?|shorts|skirts?|dress(es)?|gowns?|jumpsuits?|rompers?|co-?ords?|jackets?|coats?|blazers?|hoodies?|sweatshirts?|sweaters?|cardigans?|pullovers?|vests?|waistcoats?|suits?|tracksuits?|leggings?|jeggings?|kurt[ai]s?|kurtis|sarees?|saris?|lehengas?|salwars?|dupattas?|shararas?|sherwanis?|anarkalis?|dhotis?|nehru|ethnic|innerwear|bras?|briefs|boxers|lingerie|nightwear|pajamas?|pyjamas?|loungewear|activewear|sportswear|swimwear|bikinis?|shoes?|sneakers?|trainers|boots?|heels?|sandals?|slippers?|flip-?flops?|loafers?|flats|mules|stilettos?|wedges|footwear|juttis?|mojaris?|kolhapuris?|bags?|handbags?|totes?|backpacks?|clutch(es)?|wallets?|purses?|belts?|caps?|hats?|beanies?|scarf|scarves|stoles?|shawls?|gloves|socks|sunglasses|eyewear|watch(es)?|jewel(le)?ry|earrings?|necklaces?|bracelets?|rings?|anklets?|bangles?|hair ?clips?|scrunchies?|ties|bow ?ties|outfits?|clothes|clothing|apparel|wear|fashion|y2k|streetwear|oversized|baggy|graphic|printed|floral|polo|henley|uniform|baby ?tee)\b/i;

const AUDIENCE = /\b(men'?s?|women'?s?|ladies|girls?|boys?|kids|unisex)\b/i;

// Common fashion brands sold in India (so "levis" or "rare rabbit" alone is fine).
const BRANDS = /\b(nike|adidas|puma|reebok|asics|skechers|new balance|crocs|bata|woodland|red tape|levi'?s?|wrangler|lee|pepe|jack ?& ?jones|only|vero moda|zara|h ?& ?m|uniqlo|mango|forever ?21|bershka|gap|tommy|calvin klein|us polo|allen solly|van heusen|peter england|louis philippe|arrow|raymond|blackberrys|roadster|hrx|highlander|here ?& ?now|dressberry|mast ?& ?harbour|snitch|bewakoof|souled store|rare rabbit|rareism|the bear house|urbanic|biba|w for woman|aurelia|global desi|fabindia|manyavar|libas|anouk|sangria|max|pantaloons|westside|trends|campus|sparx|fila|under armour|superdry|guess|coach|michael kors|lavie|baggit|caprese|hidesign|fossil|titan|fastrack|ray-?ban|vans|converse|dr\.? martens|steve madden|aldo|charles ?& ?keith|mochi|metro|inc ?5|clarks|lacoste|ralph lauren|hugo boss|gucci|prada|louis vuitton|h&m)\b/i;

// Clearly not fashion: spend no search on these.
const BLOCK = [
  ['electronics', /\b(iphone|phone|mobile|laptop|macbook|tablet|ipad|tv|television|headphones?|earbuds?|airpods|speaker|camera|charger|power ?bank|smart ?watch|playstation|ps5|xbox|gpu|processor|monitor|keyboard|mouse|router|printer)\b/i],
  ['groceries & food', /\b(rice|atta|flour|dal|milk|bread|eggs?|chicken|paneer|vegetables?|fruits?|snacks?|chocolates?|biscuits?|coffee|tea|oil|ghee|sugar|salt|masala|pizza|burger|biryani|recipe)\b/i],
  ['home & kitchen', /\b(sofa|bed ?sheet|mattress|pillow|curtains?|furniture|table|chair|fridge|refrigerator|washing machine|microwave|mixer|cooker|utensils?|vacuum|air ?conditioner|\bac\b|fan|bulb)\b/i],
  ['vehicles', /\b(car|bike|scooter|motorcycle|tyres?|helmet)\b/i],
  ['medicine & health', /\b(medicine|tablets?|capsules?|syrup|vitamins?|supplements?|protein powder|whey|mask|sanitizer)\b/i],
  ['books & stationery', /\b(books?|novel|textbook|notebook|pens?|pencils?)\b/i],
];
const QUESTION = /^(who|what|when|where|why|how|is|are|can|does|do|should|tell me|explain|define|write|calculate)\b|\?\s*$/i;
const UNSAFE = /\b(porn|sex|nude|naked|weapon|guns?|drugs?|cocaine|weed)\b/i;

export function checkQuery(raw) {
  const q = String(raw || '').trim();
  if (UNSAFE.test(q)) return { verdict: 'block', reason: 'unsafe', message: 'StyleScout only searches fashion. Try something like “black oversized t-shirt”.' };
  const fashion = FASHION.test(q) || BRANDS.test(q);
  for (const [label, re] of BLOCK) {
    if (re.test(q) && !fashion) return { verdict: 'block', reason: 'category', category: label, message: `StyleScout compares fashion prices, so we don't search ${label}. Try clothes, shoes or accessories.` };
  }
  if (QUESTION.test(q) && !fashion) return { verdict: 'block', reason: 'question', message: 'That looks like a question. StyleScout searches for fashion products, like “white sneakers men”.' };
  if (q.split(/\s+/).length > 12) return { verdict: 'block', reason: 'long', message: 'That search is too long. Describe the item in a few words, like “blue denim jacket men”.' };
  if (fashion || AUDIENCE.test(q)) return { verdict: 'ok' };
  return { verdict: 'maybe', reason: 'unknown', message: `We're not sure “${q}” is a fashion item. Add a type of clothing (like “tops”, “sneakers”, “kurta”), or search anyway.` };
}
