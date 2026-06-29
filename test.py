class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def hasCycle(head: ListNode) -> bool:
    fast = head
    slow= head
    if not head or not head.next:
        return False
    while fast and fast.next:
        fast=fast.next.next
        slow=slow.next
        if fast == slow:
            return True
    return False