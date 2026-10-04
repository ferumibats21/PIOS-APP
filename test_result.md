#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================
## user_problem_statement: "Data di Expo Go selalu ke-reset/hilang setiap kali aplikasi di-reload. Perbaiki persistence: pakai @react-native-async-storage/async-storage, key PIOS_STATE, hydrate saat mount, auto-save setiap perubahan, jangan timpa data tersimpan dengan state default/demo."
## frontend:
##   - task: "Perbaiki persistence layer AsyncStorage (store.tsx)"
##     implemented: true
##     working: "NA"
##     file: "frontend/src/store.tsx"
##     stuck_count: 1
##     priority: "high"
##     needs_retesting: true
##     status_history:
##         -working: false
##         -agent: "user"
##         -comment: "User melaporkan data selalu hilang saat reload di Expo Go. Tes sebelumnya (iteration_1) hanya memverifikasi web preview/localStorage."
##         -working: "NA"
##         -agent: "main"
##         -comment: "Rewrite persistence layer di store.tsx: pakai AsyncStorage langsung, key baru PIOS_STATE (migrasi dari key lama pios_state_v1 yang double-encoded), hydration sekali saat mount, auto-save setiap perubahan state, guard agar state kosong/default tidak pernah menimpa data tersimpan, reset() ikut menghapus key dari AsyncStorage."
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 2
##   run_ui: true
## test_plan:
##   current_focus:
##     - "Perbaiki persistence layer AsyncStorage (store.tsx)"
##   stuck_tasks:
##     - "Perbaiki persistence layer AsyncStorage (store.tsx)"
##   test_all: false
##   test_priority: "stuck_first"
## agent_communication:
##     -agent: "main"
##     -message: "Fokus uji persistence: setelah Setup Wizard selesai, data harus tersimpan di key PIOS_STATE (bukan pios_state_v1), reload harus memulihkan data (wizard tidak muncul lagi), perubahan (tambah aset/update harga) tersimpan real-time, dan reload berikutnya tidak menimpa data dengan state default. Verifikasi juga migrasi: jika localStorage lama berisi pios_state_v1 (double-encoded), app tetap memuatnya lalu menulis ke PIOS_STATE."
