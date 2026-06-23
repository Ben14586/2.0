import urllib.request, json
data = json.loads(urllib.request.urlopen('http://localhost:3000/api/games').read())
for g in data['data']:
    if 'Lighting' in g['name']:
        print(g['name'])
        print(g.get('playImage'))
        print(g.get('play_image'))
