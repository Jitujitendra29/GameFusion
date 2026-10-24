"""
Main Project: GameFusion: A Python-Based Interactive Multi-Game Hub
1. Rock, Paper, Scissors game
2. Play Guess the Number game
3. Score of the two games
4. Exit
"""

import numpy as np

# Score  for both games
scores = {
    "rps": {
        "played": 0,
        "user_wins": 0,
        "computer_wins": 0,
        "ties": 0,
    },
    "guess": {
        "played": 0,
        "best_attempts": None,
        "total_attempts": 0,
    },
}


def rock_paper_scissors():
    print("\n" + "=" * 26)
    print("ROCK, PAPER, SCISSORS GAME")
    print("=" * 26)

    user = input("Enter your choice (r/p/s): ").lower().strip()
    choice = np.array(["r", "p", "s"])

    if user not in choice:
        print("invalid choice! Please choose r, p, or s.")
        return

    computer = np.random.choice(choice)
    print("Computer chose:", computer)
    scores["rps"]["played"] += 1

    if user == computer:
        print("Tie")
        scores["rps"]["ties"] += 1
    else:
        if user == "r" and computer == "p" or user == "p" and computer == "r":
            print("whoever take the paper(p),is win")
            if user == "p":
                print("You win the game!")
                scores["rps"]["user_wins"] += 1
            else:
                print("Computer wins the game!")
                scores["rps"]["computer_wins"] += 1

        elif user == "p" and computer == "s" or user == "s" and computer == "p":
            print("whoever take the scissors(s),is win")
            if user == "s":
                print("You win the game!")
                scores["rps"]["user_wins"] += 1
            else:
                print("Computer wins the game!")
                scores["rps"]["computer_wins"] += 1

        elif user == "r" and computer == "s" or user == "s" and computer == "r":
            print("whoever take the rock(r),is win")
            if user == "r":
                print("You win the game!")
                scores["rps"]["user_wins"] += 1
            else:
                print("Computer wins the game!")
                scores["rps"]["computer_wins"] += 1



def guess_the_number():
    print("\n" + "=" * 26)
    print("GUESS THE NUMBER GAME")
    print("=" * 26)


    # random number between 1 and 100
    secret_number = int(np.random.randint(1, 101))
    attempts = 0

    print("Welcome to the Number Guessing Game!")
    print("I have picked a secret number between 1 and 100. Can you guess it?")

    while True:
        try:
            user_guess = int(input("\nEnter your guess (1-100): "))

            if user_guess < 1 or user_guess > 100:
                print("Please enter a number within 1 to 100.")
                continue

            attempts += 1

            if user_guess < secret_number:
                print("Too low! Try a higher number.")
            elif user_guess > secret_number:
                print("Too high! Try a lower number.")
            else:
                print(f"Congratulations! You found the number {secret_number} in {attempts} attempts!")
                # Update score statistics
                scores["guess"]["played"] += 1
                scores["guess"]["total_attempts"] += attempts
                if scores["guess"]["best_attempts"] is None or attempts < scores["guess"]["best_attempts"]:
                    scores["guess"]["best_attempts"] = attempts
                break

        except ValueError:
            print("Invalid input! Please enter a valid integer.")



def display_scores():
    print("\n" + "=" * 45)
    print("SCOREBOARD (SEPARATED GAME SCORES)")
    print("=" * 45)

    # 1. Rock, Paper, Scissors Scores
    print("\n[ 1. Rock, Paper, Scissors Game Score ]")
    print(f"  • Total Matches Played : {scores['rps']['played']}")
    print(f"  • Player Wins          : {scores['rps']['user_wins']}")
    print(f"  • Computer Wins        : {scores['rps']['computer_wins']}")
    print(f"  • Ties                 : {scores['rps']['ties']}")

    # 2. Guess the Number Scores
    print("\n[ 2. Guess the Number Game Score ]")
    print(f"  • Total Games Played   : {scores['guess']['played']}")
    if scores["guess"]["best_attempts"] is not None:
        best = scores["guess"]["best_attempts"]
        avg = scores["guess"]["total_attempts"] / scores["guess"]["played"]
        print(f"  • Best Score (Least Tries) : {best} attempts")
        print(f"  • Average Attempts / Game  : {avg:.1f} attempts")
    else:
        print("  • Best Score (Least Tries) : No games played yet")
        print("  • Average Attempts / Game  : N/A")

    print("\n" + "=" * 45)


def main():
    while True:
        print("\n" + "#" * 64)
        print("WELCOME TO GameFusion: A Python-Based Interactive Multi-Game Hub ")
        print("#" * 64)
        print("1. Rock, Paper, Scissors game")
        print("2. Play Guess the Number game")
        print("3. Score of the two games (separated)")
        print("4. Exit")

        choice = input("\nEnter your choice (1-4): ").strip()

        if choice == "1":
            rock_paper_scissors()
        elif choice == "2":
            guess_the_number()
        elif choice == "3":
            display_scores()
        elif choice == "4":
            print("\nThanks for playing! ")
            break
        else:
            print("Invalid option. Please enter 1, 2, 3, or 4.")


if __name__ == "__main__":
    main()
