import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, ConfusionMatrixDisplay

def train_glp1_ai():
    print("🧠 Training the GLP-1 Predictor...")
    df = pd.read_csv("MODEL/FINAL_GLP1_MODEL_DATA.csv")

    # 1. Feature Prep
    # We drop the ID columns and the target; assigned_molecule is converted to dummy variables
    X = df.drop(columns=['is_adherent'])
    X = pd.get_dummies(X, columns=['assigned_molecule'])
    y = df['is_adherent']

    # 2. Split (80% Train, 20% Test)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 3. Train the Forest
    model = RandomForestClassifier(n_estimators=200, max_depth=8, random_state=42)
    model.fit(X_train, y_train)

    # 4. Performance Check
    y_pred = model.predict(X_test)
    print("\n--- MODEL PERFORMANCE ---")
    print(classification_report(y_test, y_pred))

    # 5. Feature Importance (The Presentation Slide!)
    importances = pd.Series(model.feature_importances_, index=X.columns).sort_values(ascending=True)
    
    plt.figure(figsize=(10, 6))
    importances.plot(kind='barh', color='teal')
    plt.title('What Drives GLP-1 Adherence? (Random Forest Importance)')
    plt.xlabel('Importance Score')
    plt.tight_layout()
    plt.show()

    # 6. Confusion Matrix (To see where the AI makes mistakes)
    ConfusionMatrixDisplay.from_estimator(model, X_test, y_test, cmap='Blues')
    plt.title('Adherence Prediction Accuracy')
    plt.show()

if __name__ == "__main__":
    train_glp1_ai()