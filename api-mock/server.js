/**
 * GlobalTravel Corp - Mock API Server
 * Express.js server with REST endpoints for all application features.
 */

var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');

var app = express();
var PORT = 3000;
var JWT_SECRET = 'globaltravel-secret-key-2024';

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ========================================
// Auth Middleware
// ========================================

function authMiddleware(req, res, next) {
  var authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    var token = authHeader.split(' ')[1];
    var decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ========================================
// Mock Data
// ========================================

var users = [
  { id: 1, name: 'Sarah Johnson', email: 'demo@globaltravel.com', password: 'password', department: 'Engineering', role: 'employee' },
  { id: 2, name: 'Mike Chen', email: 'manager@globaltravel.com', password: 'password', department: 'Engineering', role: 'manager' }
];

var airlines = ['United Airlines', 'Delta Air Lines', 'American Airlines', 'Southwest Airlines', 'JetBlue Airways', 'Alaska Airlines'];
var cities = ['New York (JFK)', 'Los Angeles (LAX)', 'Chicago (ORD)', 'San Francisco (SFO)', 'Seattle (SEA)', 'Boston (BOS)', 'Miami (MIA)', 'Denver (DEN)', 'Atlanta (ATL)', 'Dallas (DFW)'];

var airports = [
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York' },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles' },
  { code: 'ORD', name: "O'Hare International", city: 'Chicago' },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco' },
  { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle' },
  { code: 'BOS', name: 'Boston Logan International', city: 'Boston' },
  { code: 'MIA', name: 'Miami International', city: 'Miami' },
  { code: 'DEN', name: 'Denver International', city: 'Denver' },
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta' },
  { code: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas' }
];

var hotelNames = ['Grand Hyatt', 'Marriott Marquis', 'Hilton Garden Inn', 'Westin', 'Four Seasons', 'Sheraton', 'Holiday Inn Express', 'Courtyard by Marriott'];
var amenities = ['WiFi', 'Pool', 'Gym', 'Restaurant', 'Business Center', 'Spa', 'Room Service', 'Parking', 'Airport Shuttle', 'Breakfast Included'];

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFlights(origin, destination, date, cabinClass) {
  var count = randomInt(5, 12);
  var flights = [];
  var multiplier = cabinClass === 'business' ? 2.5 : (cabinClass === 'first' ? 4.0 : 1.0);

  for (var i = 0; i < count; i++) {
    var departHour = randomInt(6, 21);
    var departMin = randomInt(0, 3) * 15;
    var durationMin = randomInt(120, 480);
    var arrivalMin = (departHour * 60 + departMin + durationMin) % 1440;
    var stops = Math.random() < 0.3 ? 0 : (Math.random() < 0.6 ? 1 : 2);
    var basePrice = randomInt(200, 800);

    flights.push({
      id: generateId(),
      airline: randomItem(airlines),
      origin: origin || randomItem(cities),
      destination: destination || randomItem(cities),
      departDate: date || new Date().toISOString(),
      departureTime: ('0' + departHour).slice(-2) + ':' + ('0' + departMin).slice(-2),
      arrivalTime: ('0' + Math.floor(arrivalMin / 60)).slice(-2) + ':' + ('0' + (arrivalMin % 60)).slice(-2),
      durationMinutes: durationMin,
      stops: stops,
      price: Math.round(basePrice * multiplier * 100) / 100,
      cabinClass: cabinClass || 'economy',
      booked: false
    });
  }

  return flights.sort(function(a, b) { return a.price - b.price; });
}

function generateHotels(city, checkIn, checkOut) {
  var count = randomInt(6, 15);
  var hotels = [];

  for (var i = 0; i < count; i++) {
    var rating = randomInt(2, 5);
    var hotelAmenities = [];
    var amenityCount = randomInt(3, 7);
    var shuffled = amenities.slice().sort(function() { return 0.5 - Math.random(); });
    hotelAmenities = shuffled.slice(0, amenityCount);

    hotels.push({
      id: generateId(),
      name: randomItem(hotelNames) + ' ' + (city || randomItem(cities)),
      city: city || randomItem(cities),
      rating: rating,
      reviewCount: randomInt(50, 500),
      pricePerNight: randomInt(80, 450),
      amenities: hotelAmenities,
      featured: Math.random() < 0.2,
      rooms: [
        { type: 'Standard', price: randomInt(80, 200), available: randomInt(1, 10) },
        { type: 'Deluxe', price: randomInt(200, 350), available: randomInt(0, 5) },
        { type: 'Suite', price: randomInt(350, 600), available: randomInt(0, 3) }
      ]
    });
  }

  return hotels.sort(function(a, b) { return b.rating - a.rating; });
}

// In-memory stores
var trips = [
  {
    id: 'trip-1',
    userId: 1,
    name: 'NYC Business Trip',
    startDate: '2024-03-15',
    endDate: '2024-03-18',
    status: 'upcoming',
    totalCost: 2450.00,
    items: [
      { id: 'item-1', type: 'flight', date: '2024-03-15', time: '08:30', description: 'SFO → JFK', cost: 450, status: 'confirmed' },
      { id: 'item-2', type: 'hotel', date: '2024-03-15', time: '15:00', description: 'Grand Hyatt New York', cost: 350, status: 'confirmed' },
      { id: 'item-3', type: 'activity', date: '2024-03-16', time: '09:00', description: 'Client Meeting - Midtown', cost: 0, status: 'confirmed' },
      { id: 'item-4', type: 'transport', date: '2024-03-16', time: '08:00', description: 'Airport Shuttle', cost: 50, status: 'pending' },
      { id: 'item-5', type: 'flight', date: '2024-03-18', time: '18:00', description: 'JFK → SFO', cost: 480, status: 'confirmed' }
    ]
  },
  {
    id: 'trip-2',
    userId: 1,
    name: 'Chicago Conference',
    startDate: '2024-04-10',
    endDate: '2024-04-12',
    status: 'upcoming',
    totalCost: 1800.00,
    items: [
      { id: 'item-6', type: 'flight', date: '2024-04-10', time: '07:00', description: 'SFO → ORD', cost: 380, status: 'confirmed' },
      { id: 'item-7', type: 'hotel', date: '2024-04-10', time: '14:00', description: 'Marriott Marquis Chicago', cost: 280, status: 'confirmed' },
      { id: 'item-8', type: 'activity', date: '2024-04-11', time: '09:00', description: 'Tech Conference 2024', cost: 500, status: 'confirmed' }
    ]
  }
];

var travelRequests = [
  {
    id: 'tr-1',
    userId: 1,
    destination: 'London, UK',
    departDate: '2024-05-01',
    returnDate: '2024-05-05',
    purpose: 'Client onboarding meetings',
    department: 'Engineering',
    justification: 'Need to meet with new enterprise client for product integration.',
    estimatedCosts: { flights: 1200, hotels: 800, meals: 300, transport: 150, other: 50 },
    totalEstimate: 2500,
    travelers: [{ name: 'Sarah Johnson', email: 'demo@globaltravel.com' }],
    needsVisa: false,
    needsInsurance: true,
    status: 'pending',
    createdAt: '2024-02-15T10:30:00Z',
    approvals: [
      { approver: 'Mike Chen', role: 'Manager', status: 'pending', date: null }
    ]
  },
  {
    id: 'tr-2',
    userId: 1,
    destination: 'Tokyo, Japan',
    departDate: '2024-06-10',
    returnDate: '2024-06-17',
    purpose: 'Partner conference and site visit',
    department: 'Engineering',
    justification: 'Annual partner conference attendance required by agreement.',
    estimatedCosts: { flights: 2000, hotels: 1400, meals: 500, transport: 300, other: 200 },
    totalEstimate: 4400,
    travelers: [
      { name: 'Sarah Johnson', email: 'demo@globaltravel.com' },
      { name: 'Alex Rivera', email: 'alex@globaltravel.com' }
    ],
    needsVisa: true,
    needsInsurance: true,
    status: 'approved',
    createdAt: '2024-01-20T14:00:00Z',
    approvals: [
      { approver: 'Mike Chen', role: 'Manager', status: 'approved', date: '2024-01-22T09:15:00Z' },
      { approver: 'VP Finance', role: 'VP', status: 'approved', date: '2024-01-25T11:30:00Z' }
    ]
  }
];

var expenseReports = [
  {
    id: 'exp-1',
    userId: 1,
    title: 'NYC Business Trip Expenses',
    tripDestination: 'New York',
    travelRequestId: null,
    status: 'pending',
    submittedAt: '2024-03-20T10:00:00Z',
    submittedBy: 'Sarah Johnson',
    totalAmount: 1875.50,
    expenses: [
      { id: 'e-1', date: '2024-03-15', category: 'flights', description: 'SFO to JFK round trip', amount: 930.00, currency: 'USD', notes: '' },
      { id: 'e-2', date: '2024-03-15', category: 'hotels', description: 'Grand Hyatt - 3 nights', amount: 750.00, currency: 'USD', notes: 'Corporate rate applied' },
      { id: 'e-3', date: '2024-03-16', category: 'meals', description: 'Client dinner at Nobu', amount: 145.50, currency: 'USD', notes: 'With client team' },
      { id: 'e-4', date: '2024-03-17', category: 'transport', description: 'Uber rides', amount: 50.00, currency: 'USD', notes: '' }
    ]
  },
  {
    id: 'exp-2',
    userId: 1,
    title: 'Q1 Miscellaneous',
    tripDestination: 'Local',
    travelRequestId: null,
    status: 'draft',
    submittedAt: null,
    submittedBy: 'Sarah Johnson',
    totalAmount: 250.00,
    expenses: [
      { id: 'e-5', date: '2024-02-10', category: 'other', description: 'Office supplies for remote work', amount: 150.00, currency: 'USD', notes: '' },
      { id: 'e-6', date: '2024-02-20', category: 'meals', description: 'Team lunch', amount: 100.00, currency: 'USD', notes: 'Team building event' }
    ]
  }
];

var travelPolicy = {
  maxFlightCost: 2000,
  maxHotelPerNight: 300,
  maxMealPerDay: 75,
  maxTripDuration: 14,
  requiresApproval: { flights: 500, hotels: 250, total: 1000 },
  allowedCabinClasses: ['economy', 'business'],
  advanceBookingDays: 14,
  preferredAirlines: ['United Airlines', 'Delta Air Lines'],
  preferredHotels: ['Marriott', 'Hilton', 'Hyatt']
};

// ========================================
// Auth Routes
// ========================================

app.post('/api/auth/login', function(req, res) {
  var email = req.body.email;
  var password = req.body.password;

  var user = users.find(function(u) { return u.email === email && u.password === password; });

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  var token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token: token,
    user: { id: user.id, name: user.name, email: user.email, department: user.department, role: user.role }
  });
});

app.post('/api/auth/logout', function(req, res) {
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', authMiddleware, function(req, res) {
  var user = users.find(function(u) { return u.id === req.user.id; });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ id: user.id, name: user.name, email: user.email, department: user.department, role: user.role });
});

// ========================================
// Airports Route
// ========================================

app.get('/api/airports', function(req, res) {
  var q = (req.query.q || '').toLowerCase();
  if (!q) {
    return res.json(airports);
  }
  var filtered = airports.filter(function(a) {
    return a.code.toLowerCase().indexOf(q) !== -1 ||
           a.name.toLowerCase().indexOf(q) !== -1 ||
           a.city.toLowerCase().indexOf(q) !== -1;
  });
  res.json(filtered);
});

// ========================================
// Flight Routes
// ========================================

app.get('/api/flights', authMiddleware, function(req, res) {
  var flights = generateFlights(req.query.origin, req.query.destination, req.query.date, req.query.cabinClass);
  res.json(flights);
});

app.post('/api/flights', authMiddleware, function(req, res) {
  var flights = generateFlights(req.body.origin, req.body.destination, req.body.departDate, req.body.cabinClass);
  res.json(flights);
});

app.get('/api/flights/popular', authMiddleware, function(req, res) {
  var popular = [
    { origin: 'SFO', destination: 'JFK', avgPrice: 350 },
    { origin: 'LAX', destination: 'ORD', avgPrice: 280 },
    { origin: 'SEA', destination: 'BOS', avgPrice: 420 },
    { origin: 'DEN', destination: 'MIA', avgPrice: 310 }
  ];
  res.json(popular);
});

app.get('/api/flights/:id', authMiddleware, function(req, res) {
  var flight = {
    id: req.params.id,
    airline: randomItem(airlines),
    origin: randomItem(cities),
    destination: randomItem(cities),
    departureTime: '10:30',
    arrivalTime: '14:45',
    durationMinutes: 255,
    stops: 1,
    price: randomInt(200, 800),
    cabinClass: 'economy',
    booked: false
  };
  res.json(flight);
});

app.post('/api/flights/:id/book', authMiddleware, function(req, res) {
  var confirmationNumber = 'GT' + generateId().toUpperCase();

  // SEAM-3 / Q-3 — the booking now reaches the itinerary. The flight itself is
  // generated per search and never stored, so the server knows only the id it
  // was given; the item carries the confirmation code, which is what the
  // itinerary scenario matches on.
  appendItineraryItem(req.user.id, {
    type: 'flight',
    description: 'Flight ' + req.params.id,
    confirmationCode: confirmationNumber
  });

  res.json({
    confirmationNumber: confirmationNumber,
    flightId: req.params.id,
    status: 'confirmed',
    bookedAt: new Date().toISOString()
  });
});

// ========================================
// Hotel Routes
// ========================================

app.get('/api/hotels', authMiddleware, function(req, res) {
  var hotels = generateHotels(req.query.city, req.query.checkIn, req.query.checkOut);
  res.json(hotels);
});

app.get('/api/hotels/:id', authMiddleware, function(req, res) {
  var hotel = {
    id: req.params.id,
    name: randomItem(hotelNames) + ' Downtown',
    city: randomItem(cities),
    rating: randomInt(3, 5),
    reviewCount: randomInt(100, 500),
    pricePerNight: randomInt(100, 400),
    amenities: amenities.slice(0, 5),
    featured: false,
    description: 'A premier hotel located in the heart of downtown with easy access to business districts and attractions.',
    rooms: [
      { type: 'Standard', price: randomInt(100, 200), available: randomInt(1, 10) },
      { type: 'Deluxe', price: randomInt(200, 350), available: randomInt(0, 5) },
      { type: 'Suite', price: randomInt(350, 600), available: randomInt(0, 3) }
    ]
  };
  res.json(hotel);
});

app.get('/api/hotels/:id/rooms', authMiddleware, function(req, res) {
  var rooms = [
    { type: 'Standard King', price: randomInt(100, 200), available: randomInt(1, 10), beds: '1 King', maxGuests: 2 },
    { type: 'Standard Double', price: randomInt(100, 200), available: randomInt(1, 8), beds: '2 Double', maxGuests: 4 },
    { type: 'Deluxe King', price: randomInt(200, 350), available: randomInt(0, 5), beds: '1 King', maxGuests: 2 },
    { type: 'Executive Suite', price: randomInt(350, 500), available: randomInt(0, 3), beds: '1 King', maxGuests: 3 },
    { type: 'Presidential Suite', price: randomInt(500, 800), available: randomInt(0, 1), beds: '1 King + Living Area', maxGuests: 4 }
  ];
  res.json(rooms);
});

app.get('/api/hotels/:id/reviews', authMiddleware, function(req, res) {
  var page = parseInt(req.query.page) || 1;
  var perPage = parseInt(req.query.perPage) || 10;
  var reviewers = ['John D.', 'Emily R.', 'Michael T.', 'Lisa M.', 'David K.', 'Anna S.'];
  var reviewTexts = [
    'Great location and friendly staff. Would stay again!',
    'Clean rooms but noisy at night. Breakfast was excellent.',
    'Perfect for business travel. The business center was well-equipped.',
    'Beautiful property but overpriced for what you get.',
    'Excellent service and amenities. Highly recommended!'
  ];

  var reviews = [];
  for (var i = 0; i < perPage; i++) {
    reviews.push({
      id: generateId(),
      author: randomItem(reviewers),
      rating: randomInt(3, 5),
      text: randomItem(reviewTexts),
      date: '2024-0' + randomInt(1, 3) + '-' + ('0' + randomInt(1, 28)).slice(-2)
    });
  }

  res.json({
    reviews: reviews,
    totalCount: 47,
    page: page,
    perPage: perPage
  });
});

app.post('/api/bookings/hotels', authMiddleware, function(req, res) {
  var confirmationNumber = 'HT' + generateId().toUpperCase();

  // SEAM-3 / Q-3 — as above. The hotel request carries a total price, so unlike
  // the flight path this item records a real cost.
  appendItineraryItem(req.user.id, {
    type: 'hotel',
    time: '15:00',
    description: 'Hotel ' + req.body.hotelId + ' — ' + req.body.roomType,
    cost: req.body.totalPrice,
    confirmationCode: confirmationNumber
  });

  res.json({
    confirmationNumber: confirmationNumber,
    hotelId: req.body.hotelId,
    roomType: req.body.roomType,
    checkIn: req.body.checkIn,
    checkOut: req.body.checkOut,
    status: 'confirmed',
    bookedAt: new Date().toISOString()
  });
});

// ========================================
// Trip / Itinerary Routes
// ========================================

/**
 * Q-6 / ADR-020 — `totalCost` is DERIVED, not stored.
 *
 * `itinerary.service.js:19` used to do this on the client, so every consumer
 * was obliged to recompute a field the API already published, and any consumer
 * that trusted the API was wrong. The derivation moves here.
 *
 * Increment plan §7.5, answered at the Inc-3 gate: cancelled items are
 * INCLUDED. Q-6 moved who computes the total, not what the total means.
 * `itinerary.feature` pins this — cancelling the $50 shuttle must leave the
 * NYC trip at $1,330.00.
 *
 * Derived on READ. The stored totalCost stays in the fixture untouched, so if
 * this is ever removed the stale 2450 reappears and the tests fail loudly
 * instead of silently agreeing.
 */
function withDerivedTotal(trip) {
  var derived = (trip.items || []).reduce(function(sum, item) {
    return sum + (item.cost || 0);
  }, 0);
  return Object.assign({}, trip, { totalCost: derived });
}

/**
 * SEAM-3 / Q-3 / ADR-020 — a booking must persist and appear on the itinerary.
 *
 * Both booking endpoints echoed their request and wrote nothing, so the
 * producer/consumer seam between flight-search, hotel-booking and the itinerary
 * was never connected. `itinerary.feature` pinned the outcome: "A booked flight
 * never reaches the itinerary."
 *
 * Mock simplification, deliberately simple and recorded as such: the item is
 * appended to the traveller's EARLIEST trip — the one the itinerary opens by
 * default — and dated on that trip's startDate so it lands on Day 1 rather than
 * inventing a day hundreds of entries away. The mock records the cost the
 * request declared; a flight booking declares none, so it records 0.
 */
function appendItineraryItem(userId, details) {
  var owned = trips.filter(function(t) { return t.userId === userId; });
  if (owned.length === 0) return null;

  var trip = owned.slice().sort(function(a, b) {
    return a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0;
  })[0];

  var item = {
    id: 'item-' + generateId(),
    type: details.type,
    date: trip.startDate,
    time: details.time || '',
    description: details.description,
    cost: details.cost || 0,
    status: 'confirmed',
    confirmationCode: details.confirmationCode
  };

  trip.items.push(item);
  return item;
}

app.get('/api/trips', authMiddleware, function(req, res) {
  res.json(trips.map(withDerivedTotal));
});

app.post('/api/trips', authMiddleware, function(req, res) {
  var trip = {
    id: 'trip-' + generateId(),
    userId: req.user.id,
    name: req.body.name,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    status: 'upcoming',
    totalCost: 0,
    items: []
  };
  trips.push(trip);
  res.status(201).json(trip);
});

app.get('/api/trips/:id', authMiddleware, function(req, res) {
  var trip = trips.find(function(t) { return t.id === req.params.id; });
  if (!trip) {
    return res.status(404).json({ error: 'Trip not found' });
  }
  res.json(withDerivedTotal(trip));
});

app.put('/api/trips/:id', authMiddleware, function(req, res) {
  var trip = trips.find(function(t) { return t.id === req.params.id; });
  if (!trip) {
    return res.status(404).json({ error: 'Trip not found' });
  }
  Object.assign(trip, req.body);
  res.json(withDerivedTotal(trip));
});

app.delete('/api/trips/:id', authMiddleware, function(req, res) {
  var index = trips.findIndex(function(t) { return t.id === req.params.id; });
  if (index === -1) {
    return res.status(404).json({ error: 'Trip not found' });
  }
  trips.splice(index, 1);
  res.json({ message: 'Trip deleted' });
});

app.post('/api/trips/:id/share', authMiddleware, function(req, res) {
  res.json({
    shareUrl: 'https://globaltravel.com/shared/' + generateId(),
    sharedWith: req.body.email,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });
});

// ========================================
// Itinerary Item Routes
// ========================================

app.put('/api/itinerary-items/:id', authMiddleware, function(req, res) {
  var found = null;
  trips.forEach(function(trip) {
    trip.items.forEach(function(item) {
      if (item.id === req.params.id) {
        Object.assign(item, req.body);
        found = item;
      }
    });
  });

  if (!found) {
    return res.status(404).json({ error: 'Itinerary item not found' });
  }
  res.json(found);
});

app.post('/api/itinerary-items/:id/notes', authMiddleware, function(req, res) {
  var found = null;
  trips.forEach(function(trip) {
    trip.items.forEach(function(item) {
      if (item.id === req.params.id) {
        found = item;
      }
    });
  });

  if (!found) {
    return res.status(404).json({ error: 'Itinerary item not found' });
  }

  // ADR-005 / increment plan §7.4 row 23 — the note now PERSISTS.
  //
  // This handler read `req.body.notes` while every client posts
  // `{ text, createdAt }`, so it assigned `undefined` and nothing was ever
  // stored. It also replaced the whole array, which a POST to a collection
  // should not do. Both are corrected: the posted note is APPENDED.
  //
  // The author is taken from the authenticated caller rather than the request
  // body. The client never sent one (ADR-003 C-1: it had no identity to send),
  // and deriving it here means a note cannot be attributed to someone else.
  var author = users.find(function(u) { return u.id === req.user.id; });

  if (!found.notes) found.notes = [];
  found.notes.push({
    text: req.body.text,
    createdAt: req.body.createdAt || new Date().toISOString(),
    author: author ? author.name : 'You'
  });

  res.json(found);
});

// ========================================
// Travel Request Routes
// ========================================

app.get('/api/travel-requests', authMiddleware, function(req, res) {
  res.json(travelRequests);
});

app.post('/api/travel-requests', authMiddleware, function(req, res) {
  var request = Object.assign({
    id: 'tr-' + generateId(),
    userId: req.user.id,
    status: 'pending',
    createdAt: new Date().toISOString(),
    approvals: [
      { approver: 'Mike Chen', role: 'Manager', status: 'pending', date: null }
    ]
  }, req.body);

  travelRequests.push(request);
  res.status(201).json(request);
});

app.get('/api/travel-requests/:id', authMiddleware, function(req, res) {
  var request = travelRequests.find(function(r) { return r.id === req.params.id; });
  if (!request) {
    return res.status(404).json({ error: 'Travel request not found' });
  }
  res.json(request);
});

app.put('/api/travel-requests/:id', authMiddleware, function(req, res) {
  var request = travelRequests.find(function(r) { return r.id === req.params.id; });
  if (!request) {
    return res.status(404).json({ error: 'Travel request not found' });
  }
  Object.assign(request, req.body);
  res.json(request);
});

app.delete('/api/travel-requests/:id', authMiddleware, function(req, res) {
  var index = travelRequests.findIndex(function(r) { return r.id === req.params.id; });
  if (index === -1) {
    return res.status(404).json({ error: 'Travel request not found' });
  }
  travelRequests.splice(index, 1);
  res.json({ message: 'Travel request deleted' });
});

app.get('/api/travel-requests/:id/approvals', authMiddleware, function(req, res) {
  var request = travelRequests.find(function(r) { return r.id === req.params.id; });
  if (!request) {
    return res.status(404).json({ error: 'Travel request not found' });
  }
  res.json(request.approvals || []);
});

app.get('/api/travel-policy', authMiddleware, function(req, res) {
  res.json(travelPolicy);
});

// ========================================
// Expense Routes
// ========================================

app.get('/api/expense-reports', authMiddleware, function(req, res) {
  res.json(expenseReports);
});

app.post('/api/expense-reports', authMiddleware, function(req, res) {
  var report = Object.assign({
    id: 'exp-' + generateId(),
    userId: req.user.id,
    status: 'draft',
    submittedAt: null,
    submittedBy: req.user.name,
    totalAmount: 0,
    expenses: []
  }, req.body);

  expenseReports.push(report);
  res.status(201).json(report);
});

app.get('/api/expense-reports/:id', authMiddleware, function(req, res) {
  var report = expenseReports.find(function(r) { return r.id === req.params.id; });
  if (!report) {
    return res.status(404).json({ error: 'Expense report not found' });
  }
  res.json(report);
});

app.put('/api/expense-reports/:id', authMiddleware, function(req, res) {
  var report = expenseReports.find(function(r) { return r.id === req.params.id; });
  if (!report) {
    return res.status(404).json({ error: 'Expense report not found' });
  }
  Object.assign(report, req.body);

  // Recalculate total
  if (report.expenses && report.expenses.length > 0) {
    report.totalAmount = report.expenses.reduce(function(sum, e) { return sum + (e.amount || 0); }, 0);
  }

  res.json(report);
});

app.delete('/api/expense-reports/:id', authMiddleware, function(req, res) {
  var index = expenseReports.findIndex(function(r) { return r.id === req.params.id; });
  if (index === -1) {
    return res.status(404).json({ error: 'Expense report not found' });
  }
  expenseReports.splice(index, 1);
  res.json({ message: 'Expense report deleted' });
});

app.get('/api/expense-reports/statistics', authMiddleware, function(req, res) {
  var totalExpenses = expenseReports.reduce(function(sum, r) { return sum + r.totalAmount; }, 0);
  var pendingCount = expenseReports.filter(function(r) { return r.status === 'pending'; }).length;
  var approvedCount = expenseReports.filter(function(r) { return r.status === 'approved'; }).length;

  res.json({
    totalExpenses: totalExpenses,
    reportCount: expenseReports.length,
    pendingCount: pendingCount,
    approvedCount: approvedCount,
    categoryBreakdown: {
      flights: 930.00,
      hotels: 750.00,
      meals: 245.50,
      transport: 50.00,
      other: 150.00
    },
    monthlyTotals: [
      { month: '2024-01', total: 0 },
      { month: '2024-02', total: 250.00 },
      { month: '2024-03', total: 1875.50 }
    ]
  });
});

app.post('/api/expenses/:id/receipt', authMiddleware, function(req, res) {
  res.json({
    expenseId: req.params.id,
    receiptUrl: 'https://globaltravel.com/receipts/' + generateId() + '.pdf',
    uploadedAt: new Date().toISOString()
  });
});

// ========================================
// Start Server
// ========================================

app.listen(PORT, function() {
  console.log('GlobalTravel Corp Mock API running on http://localhost:' + PORT);
  console.log('Endpoints available:');
  console.log('  POST /api/auth/login');
  console.log('  GET  /api/airports?q=');
  console.log('  GET  /api/flights');
  console.log('  POST /api/flights');
  console.log('  GET  /api/flights/popular');
  console.log('  GET  /api/hotels');
  console.log('  GET  /api/trips');
  console.log('  GET  /api/travel-requests');
  console.log('  GET  /api/expense-reports');
  console.log('  GET  /api/travel-policy');
});
