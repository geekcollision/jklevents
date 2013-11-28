# Jkl Event Scraper

Scrapes events from http://www.jyvaskylanseutu.fi/tapahtumat/main.php and outputs JSON.

If you decide to use the data in a public manner, remember to add attribution to ["Jyväskylän seutu - Tapahtumakalenteri"](http://www.jyvaskylanseutu.fi/tapahtumat/main.php).

## Schema

Root: `api/v1/events`. Only GET is allowed, see [rest-sugar documentation](https://github.com/bebraw/rest-sugar) for the whole API. In addition the data is available in iCalendar format through `calendar.ics`.

## License

`jkl-event-scraper` is available under MIT. See [LICENSE](https://github.com/koodilehto/jkl-event-scraper/blob/master/LICENSE) for more details.

