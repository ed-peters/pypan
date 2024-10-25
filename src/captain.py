from events import check_location_events
from randpan import chance_of, in_range
from world import AT_SEA

def sail_to(hong, display, location):
    if hong.location == location:
        display.say("You are already in %s, Taipan." % location.txt())
        return
    hong.location = AT_SEA
    hong.month += 1
    if hong.month == 13:
        hong.year += 1
        hong.month = 1
    display.update(hong)
    display.say("Arriving at %s" % location.txt())
    hong.debt = int(hong.debt * 1.1)
    hong.bank = int(hong.bank * 1.05)
    hong.location = location
    display.update(hong)
    check_location_events(hong, display)

def check_storm(hong, destination, display):
    if not chance_of(10):
        return destination
    display.say("Storm, Taipan!!!")
    issues = [ ]
    damage = 0
    target = destination
    if chance_of(3):
        issues.append("we took some damage")
        damage = in_range(5, 20)
        hong.ship_repair -= damage
    if chance_of(3):
        target = destination.random_other()
        issues.append("we've been blown off course to %s" % target.txt())
    message = "We made it!!!"
    if len(issues) > 1:
        message = message.replace("!!!", "but %s!!!" % " and ".join(issues))
    display.say(message)
    display.update(hong)
    return target

