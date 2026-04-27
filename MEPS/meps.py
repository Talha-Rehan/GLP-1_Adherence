
import pandas as pd
meps = pd.read_csv("MEPS/meps_glp1_cost_analysis.csv")
print(meps["RXDRGNAM_STR"].unique())
import pandas as pd

# --- CONFIG ---
PMED_EXCEL = "H248A.xlsx" 
CONS_EXCEL = "H251.xlsx"
OUTPUT_FILE = "meps_glp1_cost_analysis.csv"

# Target Drugs
GLP1_DRUGS = ['OZEMPIC', 'WEGOVY', 'MOUNJARO', 'ZEPBOUND', 'RYBELSUS', 'TRULICITY', 'SAXENDA', 'VICTOZA']

def process_meps_final():
    print("Loading MEPS files...")
    
    # 1. Load Prescribed Medicines
    df_pmed = pd.read_excel(PMED_EXCEL)
    
    # Identify the correct column for drug names
    # Based on your diagnostic, RXNAME or RXDRGNAM are the targets.
    # We will force them to string to avoid the numeric issue.
    df_pmed['RXDRGNAM_STR'] = df_pmed['RXDRGNAM'].astype(str).str.upper()
    
    # 2. Filter for GLP-1s
    df_glp1 = df_pmed[df_pmed['RXDRGNAM_STR'].str.contains('|'.join(GLP1_DRUGS), na=False)].copy()
    
    if df_glp1.empty:
        print("Warning: No GLP-1s found with RXDRGNAM. Checking RXNAME...")
        df_pmed['RXNAME_STR'] = df_pmed['RXNAME'].astype(str).str.upper()
        df_glp1 = df_pmed[df_pmed['RXNAME_STR'].str.contains('|'.join(GLP1_DRUGS), na=False)].copy()

    print(f"Found {len(df_glp1)} GLP-1 prescription fills.")

    # 3. Load Consolidated Demo Data
    # Using columns from your diagnostic
    demo_cols = ['DUPERSID', 'INSCOV23', 'POVCAT23', 'AGELAST', 'SEX', 'RACETHX']
    df_cons = pd.read_excel(CONS_EXCEL, usecols=demo_cols)

    # 4. Map the exact Cost Columns from your output (with the 'X' suffix)
    # RXSF23X: Out of pocket
    # RXPV23X: Private Insurance
    # RXMR23X: Medicare
    # RXXP23X: Sum of all payments (Total)
    cost_mapping = {
        'RXSF23X': 'out_of_pocket',
        'RXPV23X': 'insurance_paid',
        'RXXP23X': 'total_drug_cost'
    }
    
    # 5. Merge and Calculate
    df_final = df_glp1.merge(df_cons, on='DUPERSID', how='left')
    
    # Clean up column names for easier use
    df_final = df_final.rename(columns=cost_mapping)
    
    # Calculate Friction Metrics
    # How much of the total cost did the patient pay?
    df_final['patient_pay_ratio'] = df_final['out_of_pocket'] / df_final['total_drug_cost']
    df_final['high_cost_burden'] = (df_final['out_of_pocket'] > 50).astype(int)

    # 6. Save
    df_final.to_csv(OUTPUT_FILE, index=False)
    print(f"File saved: {OUTPUT_FILE}")
    
    # Display Result Summary
    if not df_final.empty:
        summary = df_final.groupby('RXDRGNAM_STR' if 'RXDRGNAM_STR' in df_final else 'RXNAME_STR')['out_of_pocket'].mean()
        print("\n--- Average Out-of-Pocket Cost ---")
        print(summary)
    
    return df_final

if __name__ == "__main__":
    process_meps_final()


