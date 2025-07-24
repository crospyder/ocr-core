import { useState, useEffect } from "react";
import axios from "../axiosInstance";


export function useApiList(path) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get(path);
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [path]);

  return { items, loading, refresh: fetchItems };
}

export function useApiItem(path, id) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchItem = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await axios.get(`${path}/${id}`);
      setItem(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItem();
  }, [id, path]);

  return { item, loading, refresh: fetchItem };
}

export async function createItem(path, data) {
  const res = await axios.post(path, data);
  return res.data;
}

export async function updateItem(path, id, data) {
  const res = await axios.put(`${path}/${id}`, data);
  return res.data;
}

export async function deleteItem(path, id) {
  const res = await axios.delete(`${path}/${id}`);
  return res.data;
}
