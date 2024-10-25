#!/usr/bin/env python3

from world import Hong
from display import Display
from comprador import comprador_loop
from events import check_location_events
from captain import sail_to

# =====================================================================
# STATUS
# =====================================================================

if __name__ == '__main__':

    import curses
    from display import Display

    stdscr = curses.initscr()
    curses.noecho()
    curses.cbreak()

    try:

        SHORT_CIRCUIT = True

        curses.curs_set(0)
        curses.start_color()
        curses.use_default_colors()
        # curses.curs_set(0)

        hong = Hong("Rising Sun")
        display = Display(stdscr)
        display.update(hong)

        check_location_events(hong, display)
        while True:
            next = comprador_loop(hong, display)
            sail_to(hong, display, next)

        for i in range(10):
            check_prices(hong, display)
            display.say(str(hong.prices))

        # check_wu(hong, display)
        # check_li(hong, display)
        # check_warehouse_safety(hong, display)
        # check_personal_safety(hong, display)
        # check_police(hong, display)
        display.say("press any key to continue")

    finally:
        curses.nocbreak()
        # stdscr.keypad(False)
        curses.echo()
        curses.endwin()

