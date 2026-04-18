import sys

path = sys.argv[1]
ante_sum = blind_sum = play_sum = trips_sum = 0
n = folds = wins = ties = d_qual = 0
raise_streets = {"preflop": 0, "flop": 0, "river": 0}

with open(path) as f:
    for line in f:
        parts = line.strip().split("|")
        ante, blind, play, trips = int(parts[1]), int(parts[2]), int(parts[3]), int(parts[4])
        folded = int(parts[5]); p_won = int(parts[6]); tie = int(parts[7])
        dq = int(parts[8]); raised = parts[9]
        ante_sum += ante; blind_sum += blind; play_sum += play; trips_sum += trips
        n += 1
        if folded: folds += 1
        if p_won: wins += 1
        if tie: ties += 1
        if dq: d_qual += 1
        if raised: raise_streets[raised] += 1

print(f"n = {n:,}")
print(f"Ante EV:  {ante_sum/n:+.5f}")
print(f"Blind EV: {blind_sum/n:+.5f}")
print(f"Play EV:  {play_sum/n:+.5f}")
print(f"Trips EV: {trips_sum/n:+.5f}")
combined = (ante_sum + blind_sum + play_sum) / n
print(f"\nCombined (A+B+P) per 2-unit Ante+Blind stake: {combined:+.5f}")
print(f"House edge on Ante+Blind: {-combined/2*100:.3f}%")
print(f"\nFold rate: {folds/n*100:.2f}%")
print(f"Showdown win rate: {wins/(n-folds)*100:.2f}% of non-folds")
print(f"Tie rate: {ties/n*100:.2f}%")
print(f"Dealer qualification rate: {d_qual/(n-folds)*100:.2f}% of non-folds")
print(f"\nRaise distribution:")
for s, c in raise_streets.items():
    print(f"  {s}: {c/n*100:.2f}%")
