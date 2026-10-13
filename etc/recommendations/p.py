files = "pypan-33-jade-event.md pypan-48-consignment-pricing.md pypan-52-foreign-warehouses.md pypan-54-sponsoring-traders.md pypan-55-bodyguards.md pypan-56-ship-armor.md pypan-57-new-ports.md pypan-58-streamlined-menus.md pypan-59-corner-the-market.md pypan-60-supply-holdings.md pypan-61-rival-sabotage.md pypan-62-squeeze.md pypan-63-market-depth.md pypan-64-persistent-market.md pypan-65-commodity-chains.md pypan-66-market-saturation.md pypan-67-contraband-tiers.md pypan-68-port-differentiation.md pypan-69-port-investment.md pypan-70-political-instability.md pypan-71-exclusive-relationships.md pypan-72-fleet-evolution.md pypan-73-ship-specialization.md pypan-74-named-crew.md pypan-75-macro-scale-play.md pypan-76-rival-houses.md pypan-77-historical-events.md pypan-78-legacy-goals.md".split()

for n in files:
    f = open(n, "r").read()
    print("==================================================")
    print(n)
    print("==================================================")
    print()
    print(f)

