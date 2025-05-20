/****************************************************************************************
 * ThreadX RTOS Awareness Plugin for Segger Embedded Studio 8
 *
 * Based on the Ozone ThreadX RTOS Plugin by Filip Zawadiak, BSD-2-Clause license
 * https://github.com/fzawadiak/Ozone-ThreadX
 *
 * More info about RTOS Awareness Plugin development:
 *
 * 1. Ozone User Guide & Reference Manual --> 6.3 RTOS Awareness Plugin (page 227)
 * https://www.segger.com/downloads/jlink/UM08025_Ozone.pdf
 *
 * 2. Threads window. Writing the threads script
 * https://studio.segger.com/index.htm?https://studio.segger.com/ide_threads_window.htm
 *
 * 3. Enable RTOS Awareness in Embedded Studio
 * https://wiki.segger.com/Enable_RTOS_Awareness_in_Embedded_Studio
 ***************************************************************************************/

// Constants to use with the Threads.setColumns2 and Threads.add2 functions,
// which take the name of the table to be modified as the first parameter.
var TABLE_SEMAPHORES = "Semaphores";
var TABLE_MUTEXES    = "Mutexes";

function init()
{
    Threads.setColumns("Thread", "Priority", "State", "Runs", "Stack Size", "Max Stack Usage", "Stack Start");
    Threads.setSortByNumber("Priority");
    Threads.setColor("State", "Ready", "Executing", "Waiting");

    Threads.setColumns2(TABLE_SEMAPHORES, "Semaphore", "Count", "Suspended");
    Threads.setColumns2(TABLE_MUTEXES, "Mutex", "Owner", "Suspended");
}

function threadDescription(thread)
{
    switch (thread.tx_thread_state) {
    case 0:
        return "Ready";
    case 1:
        return "Completed";
    case 2:
        return "Terminated";
    case 3:
        return "Suspended";
    case 4:
        return "Sleeping";
    case 5:
        return "Waiting - Queue";
    case 6:
        return "Waiting - Semaphore";
    case 7:
        return "Waiting - Event flag";
    case 8:
        return "Waiting - Block pool";
    case 9:
        return "Waiting - Byte pool";
    case 10:
        return "Waiting - Filesystem I/O";
    case 11:
        return "Waiting - Filesystem";
    case 12:
        return "Waiting - Network";
    case 13:
        return "Waiting - Mutex";
    default:
        return "Other";
    }
}

function updateThreads()
{
    var executing = Debug.evaluate("(TX_THREAD*)_tx_thread_current_ptr");
    var first     = Debug.evaluate("(TX_THREAD*)_tx_thread_created_ptr");
    if (first == 0) // No threads
        return;

    var buildOptions           = Debug.evaluate("_tx_build_options");
    var isStackCheckingEnabled = (buildOptions & 0x100000) != 0; // Bit 20 = TX_ENABLE_STACK_CHECKING

    var current = first;
    do {
        var thread = Debug.evaluate("*(TX_THREAD*)" + current);
        var name   = Debug.evaluate("(char*)((TX_THREAD*)" + current + ")->tx_thread_name");

        // tx_thread_stack_highest_ptr is only available if the stack checking is enabled
        var maxStackUsage = isStackCheckingEnabled
                              ? thread.tx_thread_stack_end - thread.tx_thread_stack_highest_ptr
                              : "N/A";

        var stackStartAddr = "0x" + thread.tx_thread_stack_start.toString(16).toUpperCase();

        Threads.add(
            name,
            thread.tx_thread_priority,
            current == executing ? "Executing" : threadDescription(thread),
            thread.tx_thread_run_count,
            thread.tx_thread_stack_size + 4,
            maxStackUsage + 1,
            stackStartAddr,
            0);

        current = thread.tx_thread_created_next;
    } while (current != first);
}

function updateSemaphores()
{
    var first = Debug.evaluate("(TX_SEMAPHORE*)_tx_semaphore_created_ptr");
    if (first == 0) // No semaphores
        return;

    var current = first;
    do {
        var semaphore = Debug.evaluate("*(TX_SEMAPHORE*)" + current);
        var name      = Debug.evaluate("(char*)((TX_SEMAPHORE*)" + current + ")->tx_semaphore_name");
        var waiting   = "";

        if (semaphore.tx_semaphore_suspension_list != 0)
            waiting = Debug.evaluate("(char*)((TX_THREAD*)" + semaphore.tx_semaphore_suspension_list + ")->tx_thread_name");

        Threads.add2(
            TABLE_SEMAPHORES,
            name,
            semaphore.tx_semaphore_count,
            waiting);

        current = semaphore.tx_semaphore_created_next;
    } while (current != first);
}

function updateMutexes()
{
    var first = Debug.evaluate("(TX_MUTEX*)_tx_mutex_created_ptr");
    if (first == 0) // No mutexes
        return;

    var current = first;
    do {
        var mutex   = Debug.evaluate("*(TX_MUTEX*)" + current);
        var name    = Debug.evaluate("(char*)((TX_MUTEX*)" + current + ")->tx_mutex_name");
        var owner   = "";
        var waiting = "";

        if (mutex.tx_mutex_owner != 0)
            owner = Debug.evaluate("(char*)((TX_THREAD*)" + mutex.tx_mutex_owner + ")->tx_thread_name");

        if (mutex.tx_mutex_suspension_list != 0)
            waiting = Debug.evaluate("(char*)((TX_THREAD*)" + mutex.tx_mutex_suspension_list + ")->tx_thread_name");

        Threads.add2(
            TABLE_MUTEXES,
            name,
            owner,
            waiting);

        current = mutex.tx_mutex_created_next;
    } while (current != first);
}

function update()
{
    Threads.clear();
    Threads.newqueue("Threads");
    updateThreads();

    if (Threads.shown(TABLE_SEMAPHORES)) {
        Threads.newqueue2(TABLE_SEMAPHORES, "Semaphores");
        updateSemaphores();
    }

    if (Threads.shown(TABLE_MUTEXES)) {
        Threads.newqueue2(TABLE_MUTEXES, "Mutexes");
        updateMutexes();
    }
}

function getContextSwitchAddrs()
{
    return [
        Debug.evaluate("_tx_thread_system_suspend")
    ];
}

function getregs(thread)
{
    var i;
    var SP;
    var LR;
    var ptr;
    var thread;
    var reg = new Array(17);

    thread = Debug.evaluate("*(TX_THREAD*)" + thread);
    SP     = thread.tx_thread_stack_ptr;
    ptr    = SP;

    LR = TargetInterface.peekWord(ptr);
    ptr += 4;

    /* If LR&0x10 skip over S16...S31 */
    if ((LR & 0x10) != 0x10) {
        ptr += 4 * 16; // skip S16..S31
    }

    /* R4...R11 */
    for (i = 4; i < 12; i++) {
        reg[i] = TargetInterface.peekWord(ptr);
        ptr += 4;
    }

    /* R0...R3 */
    for (i = 0; i < 4; i++) {
        reg[i] = TargetInterface.peekWord(ptr);
        ptr += 4;
    }

    /* R12, LR, PC, PSR */
    reg[12] = TargetInterface.peekWord(ptr);
    ptr += 4;
    reg[14] = TargetInterface.peekWord(ptr);
    ptr += 4;
    reg[15] = TargetInterface.peekWord(ptr);
    ptr += 4;
    reg[16] = TargetInterface.peekWord(ptr);
    ptr += 4;

    /* If LR&0x10 skip over S0..S15 */
    if ((LR & 0x10) != 0x10) {
        ptr += 4 * 18;
    }

    /* Check if stack aligned to 8 bytes */
    if (reg[16] & (1 << 9)) {
        ptr += 4;
    }

    /* SP */
    reg[13] = SP;

    return reg;
}

function getname(thread)
{
    var tcb;
    tcb = Debug.evaluate("*(TX_THREAD*)" + thread);
    return tcb.tx_thread_name;
}

function getOSName()
{
    return "ThreadX";
}
