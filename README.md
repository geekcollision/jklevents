# jklevents

Scrapes events from http://www.jyvaskylanseutu.fi/tapahtumat/main.php and provides an API.

If you decide to use the data in a public manner, remember to add attribution to ["Jyväskylän seutu - Tapahtumakalenteri"](http://www.jyvaskylanseutu.fi/tapahtumat/main.php).

## Schema

Root: `api/v1/events`. Only GET is allowed, see [rest-sugar documentation](https://github.com/bebraw/rest-sugar) for the whole API. In addition the data is available in iCalendar format through `calendar.ics`.

## License

`jklevents` is available under MIT. See [LICENSE](https://github.com/geekcollision/jklevents/blob/master/LICENSE) for more details.

