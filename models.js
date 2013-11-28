var sugar = require('object-sugar');
var schema = sugar.schema();
var ref = sugar.ref;

var schemas = {};

module.exports = schemas;


schema(schemas, 'Event').fields({
    name: String,
    id: Number,
    date: ref('DateRange'),
    categories: Array,
    addres: ref('Address'),
    description: String,
    additionalInformation: ref('AdditionalInformation'),
    location: ref('Location')
});

schema(schemas, 'DateRange').fields({
    start: Date,
    end: Date
});

schema(schemas, 'Address').fields({
    street: String,
    city: String
});

schema(schemas, 'AdditionalInformation').fields({
    name: String,
    phone: String,
    url: String
});

schema(schemas, 'Location').fields({
    lat: String,
    lon: String,
    address: ref('LocationAddress'),
    building: String
});

schema(schemas, 'LocationAddress').fields({
    road: String,
    suburb: String,
    city: String,
    county: String,
    postcode: String
});
