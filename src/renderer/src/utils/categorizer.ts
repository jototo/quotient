interface CategoryRule {
  keywords: string[]
  categoryId: string
}

const RULES: CategoryRule[] = [
  // Income
  { keywords: ['direct deposit', 'payroll', 'paycheck', 'ach deposit', 'salary', 'wages'], categoryId: 'cat_paycheck' },
  { keywords: ['tax refund', 'irs', 'state refund'], categoryId: 'cat_refund' },
  { keywords: ['interest payment', 'dividend', 'interest earned'], categoryId: 'cat_interest' },
  { keywords: ['refund', 'return', 'credit adjustment'], categoryId: 'cat_refund' },

  // Groceries
  { keywords: ['whole foods', 'trader joe', "trader joes", 'safeway', 'kroger', 'publix', 'wegmans', 'aldi', 'sprouts', 'fresh market', 'stop & shop', 'stop and shop', 'giant food', 'food lion', 'harris teeter', 'market basket', 'meijer', 'heb ', 'h-e-b', 'winco', 'winn-dixie', 'vons', 'ralphs', 'jewel-osco', "smith's food", 'king soopers', "fry's food"], categoryId: 'cat_groceries' },
  { keywords: ['costco', "sam's club", "bj's wholesale"], categoryId: 'cat_groceries' },

  // Restaurants & Dining
  { keywords: ['doordash', 'uber eats', 'ubereats', 'grubhub', 'instacart', 'postmates'], categoryId: 'cat_restaurants' },
  { keywords: ['mcdonald', 'chick-fil-a', 'chickfila', "wendy's", 'burger king', 'taco bell', 'chipotle', 'subway', 'dunkin', 'five guys', 'shake shack', 'panera', 'panda express', "domino's", 'pizza hut', 'papa john', 'kfc ', 'popeyes', 'sonic drive', 'dairy queen', 'in-n-out', 'whataburger', 'raising cane', 'wingstop', 'jimmy john', 'jersey mike', 'firehouse subs', 'qdoba', "moe's", 'habit burger', "arby's", "culver's"], categoryId: 'cat_restaurants' },
  { keywords: ['restaurant', 'bistro', 'grill ', 'kitchen', 'eatery', 'cafe ', 'diner', 'sushi', 'ramen', 'steakhouse', 'chophouse', 'bbq', 'taqueria', 'pizzeria', 'trattoria', 'brasserie'], categoryId: 'cat_restaurants' },

  // Coffee
  { keywords: ['starbucks', 'dutch bros', "peet's", 'peets coffee', 'caribou coffee', 'coffee bean', 'tim hortons', 'blue bottle', 'philz', 'verve coffee'], categoryId: 'cat_coffee' },

  // Gas
  { keywords: ['shell ', 'chevron', 'exxon', 'mobil', 'bp ', 'sunoco', 'citgo', 'marathon', 'speedway', 'circle k', 'wawa', 'pilot travel', "love's travel", "casey's", 'kwik trip', 'racetrac', 'quiktrip', 'qt ', 'fuel', 'gasoline', 'gas station'], categoryId: 'cat_gas' },

  // Rideshare
  { keywords: ['uber ', 'lyft ', 'via ride'], categoryId: 'cat_rideshare' },

  // Parking
  { keywords: ['parking', 'parkwhiz', 'spothero', 'parkmobile', 'meter '], categoryId: 'cat_parking' },

  // Transit
  { keywords: ['mta ', 'metro card', 'clipper card', 'presto card', 'transit', 'bus fare', 'bart ', 'caltrain', 'metra', 'amtrak', 'greyhound', 'commuter'], categoryId: 'cat_transit' },

  // Rent/Mortgage
  { keywords: ['rent ', 'mortgage', 'lease payment', 'property management', 'landlord', 'hoa ', 'homeowner'], categoryId: 'cat_rent' },

  // Utilities
  { keywords: ['electric', 'electricity', 'gas & electric', 'pge ', 'pg&e', 'con edison', 'coned', 'duke energy', 'dominion energy', 'xcel energy', 'national grid', 'water bill', 'sewage', 'waste management', 'trash', 'garbage'], categoryId: 'cat_utilities' },

  // Internet/Phone
  { keywords: ['verizon', 'at&t', 'tmobile', 't-mobile', 'sprint', 'comcast', 'xfinity', 'spectrum', 'cox comm', 'centurylink', 'lumen tech', 'frontier comm', 'dish network', 'directv', 'internet service', 'wireless service', 'mint mobile', 'cricket wireless', 'boost mobile', 'google fi', 'visible '], categoryId: 'cat_internet' },

  // Streaming
  { keywords: ['netflix', 'hulu', 'disney+', 'disneyplus', 'hbo max', 'max ', 'paramount+', 'peacock', 'apple tv', 'amazon prime', 'youtube premium', 'spotify', 'apple music', 'pandora', 'tidal ', 'deezer', 'twitch'], categoryId: 'cat_streaming' },

  // Shopping/Online
  { keywords: ['amazon ', 'amzn', 'ebay ', 'etsy ', 'wish.com', 'temu ', 'shein', 'wayfair', 'chewy ', 'overstock'], categoryId: 'cat_online' },
  { keywords: ['target ', 'walmart', 'dollar tree', 'dollar general', 'five below', 'marshalls', 'tj maxx', 'ross store', 'burlington', 'homegoods', 'bed bath', 'ikea', 'home depot', "lowe's", 'menards', 'ace hardware'], categoryId: 'cat_shopping' },

  // Clothing
  { keywords: ['old navy', 'gap ', 'banana republic', 'h&m ', 'zara ', 'uniqlo', 'nordstrom', "macy's", 'bloomingdale', 'neiman marcus', 'saks fifth', 'jcrew', 'j.crew', 'anthropologie', 'free people', 'forever 21', 'express ', 'calvin klein', 'ralph lauren', 'tommy hilfiger', 'lululemon', 'nike ', 'adidas ', 'under armour', 'new balance', 'foot locker', 'finish line', 'shoe carnival'], categoryId: 'cat_clothing' },

  // Electronics
  { keywords: ['apple store', 'apple.com', 'best buy', 'newegg', 'b&h photo', 'micro center', 'dell ', 'samsung ', 'microsoft store'], categoryId: 'cat_electronics' },

  // Gaming
  { keywords: ['steam ', 'playstation', 'xbox', 'nintendo', 'gamestop', 'epic games', 'riot games', 'blizzard', 'ea games', 'ubisoft'], categoryId: 'cat_gaming' },

  // Travel
  { keywords: ['delta ', 'united airlines', 'american airlines', 'southwest', 'jetblue', 'alaska airline', 'spirit airline', 'frontier airline', 'allegiant'], categoryId: 'cat_flights' },
  { keywords: ['marriott', 'hilton', 'hyatt', 'ihg ', 'holiday inn', 'best western', 'courtyard', 'hampton inn', 'airbnb', 'vrbo', 'hotels.com', 'expedia', 'booking.com', 'priceline'], categoryId: 'cat_hotels' },

  // Health
  { keywords: ['cvs ', 'walgreens', 'rite aid', 'pharmacy', 'prescription', 'rx '], categoryId: 'cat_pharmacy' },
  { keywords: ['hospital', 'medical center', 'clinic', 'urgent care', 'doctor', 'physician', 'dentist', 'dental', 'optometrist', 'vision center', 'labcorp', 'quest diagnostics'], categoryId: 'cat_medical' },
  { keywords: ['planet fitness', 'la fitness', '24 hour fitness', 'equinox', 'anytime fitness', 'ymca', 'crossfit', 'orangetheory', 'peloton', 'gym membership', 'fitness'], categoryId: 'cat_gym' },

  // Personal Care
  { keywords: ['salon', 'haircut', 'barber', 'nail salon', 'spa ', 'massage', 'ulta beauty', 'sephora', 'bath & body', 'great clips'], categoryId: 'cat_personal' },

  // Pets
  { keywords: ['petco', 'petsmart', 'pet supplies', 'veterinar', 'vet clinic', 'banfield pet', 'chewy.com'], categoryId: 'cat_pets' },

  // Education
  { keywords: ['tuition', 'university', 'college', 'student loan', 'coursera', 'udemy', 'skillshare', 'masterclass', 'khan academy', 'duolingo', 'school ', 'books '], categoryId: 'cat_education' },

  // Fees
  { keywords: ['late fee', 'overdraft', 'atm fee', 'service charge', 'monthly fee', 'annual fee', 'bank fee', 'wire fee', 'foreign transaction'], categoryId: 'cat_financial' },

  // Gifts/Donations
  { keywords: ['paypal', 'venmo', 'cash app', 'zelle', 'charity', 'donation', '1800flowers', 'teleflora', 'ftd flowers'], categoryId: 'cat_gifts' },
]

export function categorize(description: string): string | null {
  const lower = description.toLowerCase()
  for (const rule of RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return rule.categoryId
    }
  }
  return null
}
