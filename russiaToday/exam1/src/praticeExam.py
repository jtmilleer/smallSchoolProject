import json
import random


with open("quiz.json", "r", encoding="utf-8") as f:
    data = json.load(f)

questions = data["quiz"]

# Shuffle questions
random.shuffle(questions)

score = 0

for i, q in enumerate(questions, 1):
    print(f"\nQ{i}: {q['question']}")
    options = q["options"]

    # Shuffle the multiple-choice answers
    random.shuffle(options)

    # Print answer options
    for idx, option in enumerate(options, 1):
        print(f"  {idx}. {option}")

    # Get user input
    while True:
        try:
            choice = int(input("Your answer (number): "))
            if 1 <= choice <= len(options) or choice == -1:
                break
            else:
                print("Please enter a valid option number.")
        except ValueError:
            print("Please enter a number.")

    if choice == -1:
        break
    selected = options[choice - 1]

    # Check correctness
    if selected == q["answer"]:
        print("Correct!")
        score += 1
    else:
        print(f"Wrong! Correct answer: {q['answer']}")

# Final score
print(f"\nYour final score: {score}/{len(questions)}")
