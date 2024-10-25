#!/usr/bin/env python3

from comprador import visit_wu
from config import Cities, Goods, HOME, P
from randpan import chance_of, in_range, randint, randfloat
from world import pure_random_prices

### Gameplay constants
THREATEN_DEBT_LIMIT = P("wu.threaten.limit")
ROBBERY_CASH_LIMIT = P("robbery.limit")
SHORT_CIRCUIT = True

# test - reject - nothing happens
# test - accept - adjust values
def check_new_ship(hong, display):
    time = hong.current_time()
    cost = randint() % int(1000.0 * (time + 5.0) / 6.0) * int(hong.ship_size / 50.0) + 1000
    delta = P("increment.ship_size")
    if display.ask_yn(M("upgrade.ship", "damaged" if hong.ship_repair < 80 else "fine", delta, cost)):
        hong.ship_size += delta
        hong.ship_repair = 100
        hong.cash -= cost
        display.update(hong)

# test - reject - nothing happens
# test - accept - adjust values
def check_new_gun(hong, display):
    time = hong.current_time()
    cost = randint() % int(1000.0 * (time + 5.0) / 6.0) + 500
    if hong.cash > cost and hong.ship_available() < P("gun.size") and display.ask_yn(M("upgrade.gun", cost)):
        hong.ship_guns += 1
        hong.cash -= cost
        display.update(hong)

# test - reject - nothing happens
# test - accept - adjust values
def check_new_warehouse(hong, display):
    time = hong.current_time()
    cost = randint() % int(1000.0 * (time + 5.0) / 6.0) * (hong.warehouse_size / 500) + 1000;
    delta = P("increment.warehouse_size")
    if hong.cash >= cost and display.ask_yn(M("upgrade.warehouse", delta, cost)):
        hong.warehouse_size += delta
        hong.cash -= cost
        display.update(hong)

UPGRADES = {
    0: check_new_gun,
    1: check_new_ship,
    2: check_new_warehouse
}

def check_upgrade(hong, display):
    if SHORT_CIRCUIT or (hong.current_time() > 6 and chance_of(4)):
        UPGRADES[in_range(0, 3)](hong, display)

# test - in hong kong -> transfer price is 0
# test - outside hong kong, lorcha -> adjust transfer price
# test - outside hong kong, no lorcha -> transfer unavailable
def check_transfer(hong, display):
    if hong.location == HOME:
        hong.transfer = 0
    elif hong.current_time() > 6 and chance_of(10):
        hong.transfer = int(hong.warehouse_size / 10000.0) * (randint() % 2000)
        display.say(M("transfer", hong.transfer))
    else:
        hong.transfer = -1

# test - not in hong kong -> nothing happens
# test - in hong kong, not in debt -> nothing happens
# test - in hong kong, in debt, not threatened -> threaten
# test - in hong kong, in debt, threatened -> rob & adjust values
def check_wu(hong, display):
    if hong.location != HONG_KONG:
        return
    if display.ask_yn(M("wu.prompt.visit")):
        visit_wu(hong, display)
    if hong.debt < THREATEN_DEBT_LIMIT:
        return
    if not hong.threatened:
        display.say(M("wu.threaten.1", in_range(37, 83)))
        display.say(M("wu.threaten.2"))
        display.say(M("wu.threaten.3"))
        display.say(M("wu.threaten.4"))
        hong.threatened = True
    elif chance_of(5):
        display.say(M("wu.rob", in_range(2, 5)))
        hong.cash = 0
        hong.threatened = False
        display.update(hong)

# test - not in hong kong -> you're summoned
# test - in hong kong, reject donation -> adjust values
# test - in hong kong, accept donation, enough cash -> adjust values
# test - in hong kong, accept donation, no cash, accept loan -> adjust values
# test - in hong kong, accept donation, no cash, reject loan -> adjust values
def check_li(hong, display):
    time = hong.current_time()
    if time > 1 and chance_of(20):
        hong.extorted = (hong.extorted + 1) % 4
    if hong.extorted != 0:
        return
    if hong.location != HONG_KONG:
        if SHORT_CIRCUIT or chance_of(4):
            display.say("Li Yuen has sent a lieutenant, Taipan. He says his admiral wishes to see you in Hong Kong, posthaste!")
        return
    cost = int((hong.cash / 1.8) * randfloat())
    if time > 12:
        cost = in_range(0, time * 1000) + (time * 1000)
    if not display.ask_yn("Li Yuen asks %d in donation to the temple of Tin Hau, the Sea Goddess. Will you pay?" % cost):
        display.say("Very well. I would be careful of pirates if I were you, Taipan.")
        return
    if hong.cash < cost:
        if display.ask_yn("Taipan, you do not have enough cash!! Do you want Elder Brother Wu to make up the difference for you?"):
            display.say("Very well. Elder Brother Wu will not make up the difference.")
            display.say("I would be careful of pirates if I were you, Taipan.")
            return
        display.say("Very well. Elder Brother Wu will lend you the necessary cash and add it to your debt.")
        hong.debt += cost - hong.cash
        hong.cash = 0
    else:
        hong.cash -= cost
    hong.extorted = 1
    display.update(hong)

# test - adjusts values if seizure is triggered
def check_police(hong, display):
    if hong.current_time() < 12:
        return
    if SHORT_CIRCUIT or (hong.location != HONG_KONG and hong.ship_goods[OPIUM] > 0 and chance_of(18)):
        fine = 0
        text = "Bad Joss!! The local authorities have seized your opium cargo, Taipan!"
        if hong.cash > 0:
            fine = int((hong.cash / 1.8) * randfloat()) + 1
            text = text.replace(", ", " and fined you %d, " % fine)
        display.say(text)
        hong.ship_goods[OPIUM] = 0
        hong.cash -= fine
        display.update(hong)

# test - adjusts values if robbery is triggered
def check_personal_safety(hong, display):
    if hong.current_time() < 12:
        return
    if SHORT_CIRCUIT or (hong.location != HONG_KONG and hong.cash > ROBBERY_CASH_LIMIT and chance_of(20)):
        cost = int((hong.cash / 1.4) * randfloat())
        if cost > 0:
            display.say("Bad joss!! You have been beaten up and robbed of %d in cash." % cost)
            hong.cash -= cost
            display.update(hong)

# test - adjusts values if theft is triggered
def check_warehouse_safety(hong, display):
    if hong.current_time() < 12:
        return
    if SHORT_CIRCUIT or (hong.warehouse_available() < hong.warehouse_size and chance_of(50)):
        display.say("Messenger reports large warehouse theft, Taipan.")
        for good in Goods.list():
            f = int(hong.warehouse_goods[good] * randfloat() / 1.8)
            hong.warehouse_goods[good] = f
        display.update(hong)

# test - issues price shock
def check_prices(hong, display):
    if hong.current_time() > 1:
        hong.prices = pure_random_prices()
        if SHORT_CIRCUIT or chance_of(10):
            good = Goods.random()
            if chance_of(2):
                display.say(good.pos())
                hong.prices[good] *= in_range(0, 5) + 5
            else:
                display.say(good.neg())
                hong.prices[good] = int(hong.prices[good] / 5)
            display.update(hong)

def check_location_events(hong, display):
    check_wu(hong, display)
    check_li(hong, display)
    check_upgrade(hong, display)
    check_transfer(hong, display)
    check_police(hong, display)
    check_personal_safety(hong, display)
    check_warehouse_safety(hong, display)
    check_prices(hong, display)
