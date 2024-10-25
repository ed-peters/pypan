import json
import os.path as path
import random
import randpan

# =====================================================================
# GOODS
# =====================================================================

class Goods:

    instances = [ ]

    def __init__(self, data):
        self.name = data["name"]
        self.pos_shock = data["positive"]
        self.neg_shock = data["negative"]
        self.mult = data["multiplier"]
        self.illegal = data.get("illegal", False)
        Goods.instances.append(self)

    def __repr__(self):
        return self.name.upper().replace(" ", "_")

    @staticmethod
    def new_basket():
        d = { }
        for g in Goods.list():
            d[g] = 0
        return d

    @staticmethod
    def select():
        return random.choice(Goods.instances)

    @staticmethod
    def list():
        return Goods.instances
    
    @staticmethod
    def prompt(text, display):
        l = Goods.list()
        l = [ (str(i+1), l[i].name.title(), l[i]) for i in range(len(l)) ]
        return display.ask_opt3(text, l, True)

def init_goods(data):
    for g in data:
        Goods(g)

def G(key):
    if type(key) == int:
        return Goods.instances[key]
    else:
        for g in Goods.list():
            if key.upper() in g.name.upper():
                return g
    return None

# =====================================================================
# Cities
# =====================================================================

HOME = None

class Cities:

    instances = [ ]

    def __init__(self, name):
        self.name = name
        self.home = len(Cities.instances) == 0
        Cities.instances.append(self)

    def __repr__(self):
        return self.name.upper().replace(" ", "_")

    def random_other(self):
        while True:
            c = random.choice(Cities.instances)
            if c != self:
                return c
    
    @staticmethod
    def prompt(text, display):
        l = Cities.list()
        l = [ (str(i+1), l[i].name.title(), l[i]) for i in range(len(l)) ]
        return display.ask_opt3(text, l, True)

    @staticmethod
    def select():
        return random.choice(Cities.instances)

    @staticmethod
    def list():
        return Cities.instances

def init_cities(data):
    global HOME
    for c in data:
        Cities(c)
    HOME = Cities.instances[0]

def C(key):
    if type(key) == int:
        return Cities.instances[key]
    else:
        for g in Cities.list():
            if key.upper() in g.name.upper():
                return g
    return None

# =====================================================================
# Messages
# =====================================================================

MESSAGES = { }

def init_messages(data):
    for key, val in data.items():
        MESSAGES[key] = val

def M(key, *args):
    return MESSAGES[key] % tuple(args)

# =====================================================================
# Props
# =====================================================================

PROPS = { }

def init_props(data):
    for key, val in data.items():
        PROPS[key] = val

def P(key):
    return PROPS.get(key, 0)

# =====================================================================
# Init
# =====================================================================

config = json.loads(open("%s/../etc/config.json" % path.dirname(__file__), "r").read())
init_messages(config["messages"])
init_props(config["properties"])
init_goods(config["goods"])
init_cities(config["cities"])
