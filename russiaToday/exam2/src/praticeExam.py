import json
import random

# Load quiz JSON
with open("quiz.json", "r", encoding="utf-8") as f:
    data = json.load(f)

questions = data["quiz"]

# Pick 30 random questions (or all if less than 30)
num_questions = min(30, len(questions))
questions = random.sample(questions, num_questions)

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
            choice = int(input("Your answer (number, -1 to quit): "))
            if choice == -1 or 1 <= choice <= len(options):
                break
            else:
                print("Please enter a valid option number or -1 to quit.")
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
    if "explanation" in q:
        print(f"Explanation: {q['explanation']}")

# Final score
print(f"\nYour final score: {score}/{i}")
